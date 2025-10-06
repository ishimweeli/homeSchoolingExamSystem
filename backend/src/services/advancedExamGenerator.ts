import OpenAI from 'openai';
import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SectionConfig {
  code: string; // "A", "B", "C"
  title: string; // "READING COMPREHENSION"
  description?: string;
  instructions?: string;
  totalMarks: number;
  questions: QuestionConfig[];
}

interface QuestionConfig {
  type: QuestionType;
  count: number;
  marks: number;
  includeContext?: boolean; // Add reading passage, scenario, etc.
  topic?: string;
  difficulty?: string;
}

interface AdvancedExamConfig {
  title: string;
  subject: string;
  gradeLevel: number;
  duration: number;
  sections: SectionConfig[];
}

export async function generateAdvancedExam(config: AdvancedExamConfig, creatorId: string) {
  const { title, subject, gradeLevel, duration, sections } = config;

  // Create exam
  const exam = await prisma.exam.create({
    data: {
      title,
      subject,
      gradeLevel,
      duration,
      hasAdvancedStructure: true,
      aiGenerated: true,
      status: 'DRAFT',
      creatorId,
      totalMarks: sections.reduce((sum, s) => sum + s.totalMarks, 0),
    },
  });

  // Generate each section
  for (const sectionConfig of sections) {
    const section = await prisma.examSection.create({
      data: {
        examId: exam.id,
        code: sectionConfig.code,
        title: sectionConfig.title,
        description: sectionConfig.description,
        instructions: sectionConfig.instructions,
        totalMarks: sectionConfig.totalMarks,
        order: sections.indexOf(sectionConfig),
      },
    });

    // Generate questions for this section
    let questionOrder = 1;
    for (const qConfig of sectionConfig.questions) {
      const questions = await generateSectionQuestions(
        section.id,
        exam.id,
        qConfig,
        subject,
        gradeLevel,
        questionOrder
      );

      questionOrder += questions.length;
    }
  }

  // Return full exam with sections
  return prisma.exam.findUnique({
    where: { id: exam.id },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });
}

async function generateSectionQuestions(
  sectionId: string,
  examId: string,
  config: QuestionConfig,
  subject: string,
  gradeLevel: number,
  startOrder: number
) {
  const { type, count, marks, includeContext, topic, difficulty } = config;

  const prompt = `Generate ${count} ${type.replace('_', ' ')} question(s) for:
Subject: ${subject}
Grade Level: ${gradeLevel}
${topic ? `Topic: ${topic}` : ''}
Difficulty: ${difficulty || 'medium'}
Marks per question: ${marks}
${includeContext ? 'Include a context/passage for these questions.' : ''}

Format the response as JSON array:
[
  {
    "question": "Question text",
    "options": ["A", "B", "C", "D"], // Only for MCQ
    "correctAnswer": "Answer", // String, array, or object depending on type
    "explanation": "Why this is correct",
    ${includeContext ? '"context": "Reading passage or scenario text",' : ''}
    "questionNumber": "${startOrder}"
  }
]

Make questions engaging, grade-appropriate, and educational.`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator specializing in creating high-quality exam questions for K-12 students.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);
    const questionsData = parsed.questions || [];

    // Create questions in database
    const createdQuestions = [];
    for (let i = 0; i < questionsData.length; i++) {
      const qData = questionsData[i];

      const question = await prisma.question.create({
        data: {
          examId,
          sectionId,
          type,
          question: qData.question,
          options: qData.options ? JSON.stringify(qData.options) : null,
          correctAnswer: JSON.stringify(qData.correctAnswer),
          marks,
          explanation: qData.explanation,
          difficulty: difficulty || 'MEDIUM',
          topic: topic,
          context: qData.context,
          questionNumber: qData.questionNumber || `${startOrder + i}`,
          order: startOrder + i,
          aiGenerated: true,
        },
      });

      createdQuestions.push(question);
    }

    return createdQuestions;
  } catch (error) {
    console.error('Error generating section questions:', error);
    throw new Error(`Failed to generate questions for section: ${error.message}`);
  }
}

// PDF Upload and Recreation
export async function recreateExamFromPDF(pdfText: string, creatorId: string) {
  const prompt = `Analyze this exam PDF text and extract its structure:

${pdfText}

Return a JSON object with this structure:
{
  "title": "Exam title",
  "subject": "Subject name",
  "gradeLevel": 5,
  "duration": 120,
  "sections": [
    {
      "code": "A",
      "title": "SECTION TITLE",
      "instructions": "Section instructions",
      "totalMarks": 20,
      "questions": [
        {
          "type": "MULTIPLE_CHOICE",
          "question": "Question text",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "B",
          "marks": 1,
          "questionNumber": "1",
          "context": "Reading passage if any"
        }
      ]
    }
  ]
}

Extract ALL questions with their exact text, options, and structure. Preserve section organization.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Use stronger model for PDF parsing
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing and structuring educational exam documents. Extract exam content with perfect accuracy.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for accuracy
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const examConfig = JSON.parse(responseText);

    // Generate exam using the extracted structure
    return generateAdvancedExam(examConfig, creatorId);
  } catch (error) {
    console.error('Error recreating exam from PDF:', error);
    throw new Error(`Failed to recreate exam from PDF: ${error.message}`);
  }
}
