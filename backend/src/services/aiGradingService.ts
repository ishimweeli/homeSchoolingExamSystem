import OpenAI from 'openai';
import { prisma } from '../utils/db';

interface GradingCriteria {
  clarity: number; // 0-10
  accuracy: number; // 0-10
  depth: number; // 0-10
  grammar: number; // 0-10
  relevance: number; // 0-10
}

interface EssayFeedback {
  score: number;
  criteria: GradingCriteria;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  suggestions: string[];
}

class AIGradingService {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async gradeEssay(
    question: string,
    answer: string,
    rubric?: any,
    gradeLevel?: number
  ): Promise<EssayFeedback> {
    if (!this.openai) {
      throw new Error('OpenAI service not configured');
    }

    const prompt = `
      You are an expert teacher grading a student's essay response.

      Grade Level: ${gradeLevel || 'Not specified'}

      Question: ${question}

      Student Answer: ${answer}

      ${rubric ? `Grading Rubric: ${JSON.stringify(rubric)}` : ''}

      Please evaluate the answer based on:
      1. Clarity (0-10): How clear and well-organized is the response?
      2. Accuracy (0-10): How factually correct is the information?
      3. Depth (0-10): How thoroughly does it address the question?
      4. Grammar (0-10): Grammar, spelling, and sentence structure
      5. Relevance (0-10): How well does it answer the specific question?

      Provide your response in JSON format:
      {
        "score": (0-100),
        "criteria": {
          "clarity": (0-10),
          "accuracy": (0-10),
          "depth": (0-10),
          "grammar": (0-10),
          "relevance": (0-10)
        },
        "strengths": ["strength1", "strength2"],
        "improvements": ["improvement1", "improvement2"],
        "detailedFeedback": "Detailed feedback paragraph",
        "suggestions": ["suggestion1", "suggestion2"]
      }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator providing constructive feedback on student work. Be encouraging but honest.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for consistent grading
        max_tokens: 1000,
      });

      const feedback = JSON.parse(response.choices[0].message.content || '{}');
      return feedback;
    } catch (error) {
      console.error('AI grading error:', error);
      throw new Error('Failed to grade essay');
    }
  }

  async gradeMathProblem(
    question: string,
    answer: string,
    showWork: boolean = true
  ): Promise<{
    isCorrect: boolean;
    score: number;
    steps: string[];
    feedback: string;
    correctSolution?: string;
  }> {
    if (!this.openai) {
      throw new Error('OpenAI service not configured');
    }

    const prompt = `
      Evaluate this math problem solution:

      Question: ${question}
      Student Answer: ${answer}

      Please check if the answer is correct and evaluate the work shown.
      ${showWork ? 'Analyze the student\'s work step by step.' : ''}

      Provide response in JSON:
      {
        "isCorrect": boolean,
        "score": 0-100,
        "steps": ["step analysis 1", "step analysis 2"],
        "feedback": "detailed feedback",
        "correctSolution": "correct solution if answer is wrong"
      }
    `;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a math teacher evaluating student work. Be precise and helpful.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async gradeCode(
    question: string,
    code: string,
    language: string,
    testCases?: any[]
  ): Promise<{
    score: number;
    functionality: number;
    style: number;
    efficiency: number;
    feedback: string;
    issues: string[];
    suggestions: string[];
  }> {
    if (!this.openai) {
      throw new Error('OpenAI service not configured');
    }

    const prompt = `
      Evaluate this code submission:

      Language: ${language}
      Question: ${question}

      Code:
      \`\`\`${language}
      ${code}
      \`\`\`

      ${testCases ? `Test Cases: ${JSON.stringify(testCases)}` : ''}

      Evaluate based on:
      1. Functionality (0-10): Does it solve the problem correctly?
      2. Style (0-10): Code readability and conventions
      3. Efficiency (0-10): Algorithm efficiency and optimization

      Response format:
      {
        "score": 0-100,
        "functionality": 0-10,
        "style": 0-10,
        "efficiency": 0-10,
        "feedback": "detailed feedback",
        "issues": ["issue1", "issue2"],
        "suggestions": ["improvement1", "improvement2"]
      }
    `;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a programming instructor evaluating student code.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async generatePersonalizedFeedback(
    studentId: string,
    examId: string,
    answers: any[]
  ): Promise<{
    overallFeedback: string;
    strengths: string[];
    areasForImprovement: string[];
    recommendations: string[];
    studyPlan: string[];
  }> {
    // Get student's performance history
    const recentAttempts = await prisma.examAttempt.findMany({
      where: {
        studentId,
        isCompleted: true,
      },
      include: {
        exam: true,
        grade: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 5,
    });

    const performanceData = recentAttempts.map(attempt => ({
      subject: (attempt as any).exam?.subject || 'Unknown',
      score: (attempt as any).grade?.percentage || 0,
    }));

    const prompt = `
      Generate personalized feedback for a student based on their exam performance:

      Current Exam Answers: ${JSON.stringify(answers)}
      Recent Performance: ${JSON.stringify(performanceData)}

      Provide comprehensive feedback:
      {
        "overallFeedback": "paragraph of overall assessment",
        "strengths": ["strength1", "strength2", "strength3"],
        "areasForImprovement": ["area1", "area2"],
        "recommendations": ["specific recommendation 1", "recommendation 2"],
        "studyPlan": ["week 1 focus", "week 2 focus", "week 3 focus"]
      }
    `;

    if (!this.openai) {
      // Return default feedback if AI not available
      return {
        overallFeedback: 'Good effort on your exam. Continue practicing regularly.',
        strengths: ['Consistent effort', 'Good time management'],
        areasForImprovement: ['Review core concepts', 'Practice more problems'],
        recommendations: ['Daily practice sessions', 'Review notes regularly'],
        studyPlan: ['Review fundamentals', 'Practice problems', 'Mock tests'],
      };
    }

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an educational advisor providing personalized learning recommendations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 1200,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async analyzeWritingStyle(text: string): Promise<{
    readabilityScore: number;
    sentenceComplexity: string;
    vocabularyLevel: string;
    tone: string;
    suggestions: string[];
  }> {
    if (!this.openai) {
      throw new Error('OpenAI service not configured');
    }

    const prompt = `
      Analyze this text for writing style:

      "${text}"

      Provide analysis:
      {
        "readabilityScore": 0-100,
        "sentenceComplexity": "simple|moderate|complex",
        "vocabularyLevel": "basic|intermediate|advanced",
        "tone": "formal|informal|academic|conversational",
        "suggestions": ["suggestion for improvement 1", "suggestion 2"]
      }
    `;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a writing coach analyzing text quality.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }
}

export const aiGradingService = new AIGradingService();
export default aiGradingService;