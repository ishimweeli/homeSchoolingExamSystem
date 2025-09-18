import OpenAI from 'openai'
import { QuestionType } from '@prisma/client'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ExamGenerationParams {
  subject: string
  gradeLevel: number
  topics: string[]
  numberOfQuestions: number
  questionTypes: {
    multipleChoice?: number
    trueFalse?: number
    shortAnswer?: number
    longAnswer?: number
    fillBlanks?: number
    mathProblem?: number
  }
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface GeneratedQuestion {
  type: QuestionType
  question: string
  options?: string[]
  correctAnswer: any
  marks: number
  difficulty: string
  topic: string
  gradingRubric?: any
  sampleAnswer?: string
}

export class AIService {
  async generateExam(params: ExamGenerationParams): Promise<GeneratedQuestion[]> {
    const prompt = this.buildExamPrompt(params)
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator creating comprehensive exams for homeschool students. Generate questions that are age-appropriate, clear, and educational.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0].message.content
      if (!content) throw new Error('No content generated')

      const result = JSON.parse(content)
      return this.formatQuestions(result.questions, params)
    } catch (error) {
      console.error('AI Exam Generation Error:', error)
      throw new Error('Failed to generate exam')
    }
  }

  async generateAdaptiveExam(adaptiveParams: any): Promise<GeneratedQuestion[]> {
    const prompt = this.buildAdaptiveExamPrompt(adaptiveParams)
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational AI that creates personalized, adaptive exams. Analyze student performance data to create targeted assessments that challenge students appropriately while addressing their specific learning needs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0].message.content
      if (!content) throw new Error('No content generated')

      const result = JSON.parse(content)
      return this.formatAdaptiveQuestions(result.questions, adaptiveParams)
    } catch (error) {
      console.error('AI Adaptive Exam Generation Error:', error)
      throw new Error('Failed to generate adaptive exam')
    }
  }

  async gradeAnswer(
    question: string,
    questionType: QuestionType,
    studentAnswer: any,
    correctAnswer: any,
    gradingRubric?: any
  ): Promise<{
    score: number
    maxScore: number
    feedback: string
    suggestions?: string[]
  }> {
    const prompt = this.buildGradingPrompt(
      question,
      questionType,
      studentAnswer,
      correctAnswer,
      gradingRubric
    )

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator grading student answers. Provide fair, constructive feedback that helps students learn. Be encouraging while pointing out areas for improvement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0].message.content
      if (!content) throw new Error('No grading generated')

      return JSON.parse(content)
    } catch (error) {
      console.error('AI Grading Error:', error)
      throw new Error('Failed to grade answer')
    }
  }

  async generateLessonPlan(prompt: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert homeschool curriculum designer. Create comprehensive, engaging lesson plans that are practical for parents to implement with minimal preparation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0].message.content
      if (!content) throw new Error('No lesson plan generated')

      return content
    } catch (error) {
      console.error('AI Lesson Plan Generation Error:', error)
      throw new Error('Failed to generate lesson plan')
    }
  }

  async generateStudyRecommendations(
    studentId: string,
    recentPerformance: any[]
  ): Promise<{
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    nextTopics: string[]
  }> {
    const prompt = `Based on the following student performance data, provide personalized study recommendations:
    ${JSON.stringify(recentPerformance)}
    
    Return a JSON object with strengths, weaknesses, recommendations, and suggested next topics.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an educational advisor providing personalized learning recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0].message.content
      if (!content) throw new Error('No recommendations generated')

      return JSON.parse(content)
    } catch (error) {
      console.error('AI Recommendations Error:', error)
      throw new Error('Failed to generate recommendations')
    }
  }

  private buildExamPrompt(params: ExamGenerationParams): string {
    const { subject, gradeLevel, topics, numberOfQuestions, questionTypes, difficulty } = params

    return `Generate ${numberOfQuestions} exam questions for ${subject} at grade ${gradeLevel} level.
    
Topics to cover: ${topics.join(', ')}
Difficulty: ${difficulty}

Question type distribution:
${Object.entries(questionTypes).map(([type, count]) => `- ${type}: ${count} questions`).join('\n')}

For each question, provide:
1. The question text (clear and age-appropriate)
2. Question type
3. Options (for multiple choice)
4. Correct answer
5. Point value (marks)
6. Grading rubric
7. Sample answer (for essay questions)

Return a JSON object with an array of questions. Each question should have:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER" | "FILL_BLANKS" | "MATCHING" | "ORDERING" | "MATH_PROBLEM" | "CODING" | "DIAGRAM",
      "question": "question text",
      "options": ["A", "B", "C", "D"] (for MCQ, null for other types),
      "correctAnswer": "answer",
      "marks": number,
      "difficulty": "easy" | "medium" | "hard",
      "topic": "specific topic",
      "gradingRubric": {criteria for grading},
      "sampleAnswer": "sample answer for reference"
    }
  ]
}

IMPORTANT: Use exactly these type values: MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, LONG_ANSWER, FILL_BLANKS (not FILL_IN_THE_BLANKS), MATCHING, ORDERING, MATH_PROBLEM, CODING, DIAGRAM`
  }

  private buildAdaptiveExamPrompt(params: any): string {
    const { subject, gradeLevel, numberOfQuestions, difficulty, adaptiveParams, instructions } = params

    return `Create an adaptive exam for ${subject}, Grade ${gradeLevel}, with ${numberOfQuestions} questions.

STUDENT PERFORMANCE PROFILE:
- Current Skill Level: ${adaptiveParams.skillLevel}/10
- Strengths: ${adaptiveParams.strengths.join(', ') || 'None identified yet'}
- Weaknesses: ${adaptiveParams.weaknesses.join(', ') || 'None identified yet'}  
- Focus Areas: ${adaptiveParams.focusAreas.join(', ')}
- Recommended Topics: ${adaptiveParams.recommendedTopics.join(', ') || 'General coverage'}

TARGET DIFFICULTY: ${difficulty}

ADAPTIVE INSTRUCTIONS:
${instructions}

EXAM REQUIREMENTS:
1. 60% of questions should target weak areas for improvement
2. 30% of questions should reinforce strengths 
3. 10% of questions should introduce new challenges
4. Gradually increase difficulty based on skill level
5. Include varied question types appropriate for the subject
6. Provide clear, detailed grading rubrics
7. Focus on conceptual understanding, not just memorization

Question Type Distribution (vary based on subject):
- Multiple Choice: 40%
- Short Answer: 30% 
- Long Answer/Essay: 20%
- Problem Solving: 10%

Return a JSON object with an array of adaptive questions:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER" | "FILL_BLANKS" | "MATH_PROBLEM",
      "question": "question text",
      "options": ["A", "B", "C", "D"] (for MCQ, null for others),
      "correctAnswer": "answer",
      "marks": number (1-10 based on difficulty),
      "difficulty": "easy" | "medium" | "hard",
      "topic": "specific topic from focus areas",
      "adaptiveReason": "why this question was chosen for this student",
      "gradingRubric": {detailed criteria for grading},
      "sampleAnswer": "exemplary answer",
      "learningObjective": "what this question assesses"
    }
  ]
}

IMPORTANT: 
- Questions must be appropriate for Grade ${gradeLevel}
- Use exactly these type values: MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, LONG_ANSWER, FILL_BLANKS, MATH_PROBLEM
- Each question should have clear learning objectives
- Tailor difficulty progression to the student's skill level`
  }

  private buildGradingPrompt(
    question: string,
    questionType: QuestionType,
    studentAnswer: any,
    correctAnswer: any,
    gradingRubric?: any
  ): string {
    return `Grade the following student answer:

Question: ${question}
Question Type: ${questionType}
Student Answer: ${JSON.stringify(studentAnswer)}
Correct Answer: ${JSON.stringify(correctAnswer)}
${gradingRubric ? `Grading Rubric: ${JSON.stringify(gradingRubric)}` : ''}

Evaluate the answer and provide:
1. A score (0-100% of max points)
2. Detailed feedback explaining the grade
3. Suggestions for improvement

For partial credit, consider:
- Correct reasoning but minor errors
- Partially correct answers
- Good effort with conceptual understanding

Return a JSON object:
{
  "score": number (0-100 representing percentage),
  "maxScore": 100,
  "feedback": "detailed feedback",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`
  }

  private formatQuestions(
    rawQuestions: any[],
    params: ExamGenerationParams
  ): GeneratedQuestion[] {
    return rawQuestions.map((q, index) => {
      // Map AI response types to our schema types
      let questionType = q.type;
      
      // Handle variations in type names from AI
      if (questionType === 'FILL_IN_THE_BLANKS' || questionType === 'FILL_BLANKS') {
        questionType = 'FILL_BLANKS';
      } else if (questionType === 'LONG_ANSWER' || questionType === 'ESSAY') {
        questionType = 'LONG_ANSWER';
      }
      
      return {
        type: questionType as QuestionType,
        question: q.question,
        options: q.options || null,
        correctAnswer: q.correctAnswer,
        marks: q.marks || 5,
        difficulty: q.difficulty || params.difficulty,
        topic: q.topic || params.topics[0],
        gradingRubric: q.gradingRubric || null,
        sampleAnswer: q.sampleAnswer || null,
      };
    });
  }

  private formatAdaptiveQuestions(rawQuestions: any[], params: any): GeneratedQuestion[] {
    return rawQuestions.map((q) => ({
      type: q.type as QuestionType,
      question: q.question,
      options: q.options || null,
      correctAnswer: q.correctAnswer,
      marks: q.marks || this.calculateAdaptiveMarks(q.difficulty, params.adaptiveParams.skillLevel),
      difficulty: q.difficulty || params.difficulty,
      topic: q.topic,
      gradingRubric: {
        ...q.gradingRubric,
        adaptiveReason: q.adaptiveReason,
        learningObjective: q.learningObjective
      },
      sampleAnswer: q.sampleAnswer || null,
    }))
  }

  private calculateAdaptiveMarks(difficulty: string, skillLevel: number): number {
    const baseMarks = {
      easy: 3,
      medium: 5,
      hard: 8
    }
    
    const skillMultiplier = Math.max(0.5, Math.min(1.5, skillLevel / 6))
    return Math.round(baseMarks[difficulty as keyof typeof baseMarks] * skillMultiplier)
  }
}

export const aiService = new AIService()