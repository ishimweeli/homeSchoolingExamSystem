import OpenAI from 'openai';

let openRouterClient: OpenAI | null = null;

/**
 * Get OpenRouter AI client
 * OpenRouter gives access to multiple AI providers (OpenAI, Anthropic, Google, Meta, etc.)
 * through a single API with flexible pricing
 */
export const getAIClient = (): OpenAI | null => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  // Debug logging
  console.log('🔑 OpenRouter API Key Status:', apiKey ? `Found (${apiKey.substring(0, 15)}...)` : '❌ MISSING!');
  console.log('🌐 Base URL:', 'https://openrouter.ai/api/v1');
  console.log('🤖 Model:', process.env.AI_MODEL || 'openai/gpt-4o-mini');
  
  if (!openRouterClient && apiKey) {
    openRouterClient = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.SITE_URL || 'https://homeschool-exam.com',
        'X-Title': process.env.SITE_NAME || 'HomeSchool Exam System',
      },
    });
    console.log('✅ OpenRouter client initialized successfully');
  }
  
  return openRouterClient;
};

/**
 * Get the AI model to use
 * OpenRouter format: "provider/model" 
 * Examples: "openai/gpt-4o-mini", "anthropic/claude-3-sonnet", "google/gemini-pro"
 */
export const getAIModel = (customModel?: string): string => {
  // If custom model is provided, use it
  if (customModel) {
    return customModel;
  }
  
  // Use environment variable if set, otherwise default to GPT-4o-mini
  return process.env.AI_MODEL || 'openai/gpt-4o-mini';
};

/**
 * Check if AI services are available
 */
export const isAIAvailable = (): boolean => {
  return !!process.env.OPENROUTER_API_KEY;
};

// ===== Exam Generation (Centralized Prompt + Call) =====

export type ExamDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface ExamGenerationParams {
  subject: string;
  gradeLevel: number;
  topics: string[];
  questionCount: number;
  difficulty: ExamDifficulty;
  questionTypes?: string[];
}

const stripCodeFences = (text: string): string => {
  let cleaned = (text || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json|javascript)?\n?/, '');
    cleaned = cleaned.replace(/\n?```$/, '');
    cleaned = cleaned.trim();
  }
  return cleaned;
};

const buildExamPrompt = (p: ExamGenerationParams): string => {
  return `Create an exam with the following specifications:
    - Subject: ${p.subject}
    - Grade Level: ${p.gradeLevel}
    - Topics: ${p.topics.join(', ')}
    - Number of Questions: ${p.questionCount}
    - Difficulty: ${p.difficulty}
    - Question Types: ${p.questionTypes?.join(', ') || 'Mix of all types'}

    STRICT OUTPUT CONTRACT:
    - Respond with ONLY a JSON array (no prose, no markdown, no leading/trailing text)
    - Every element MUST be a JSON object with these fields:
      {
        "type": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER" | "FILL_BLANKS" | "MATCHING" | "ORDERING" | "MATH_PROBLEM" | "CODING" | "DIAGRAM",
        "question": string,
        "options": depends on type (see below),
        "correctAnswer": depends on type (see below),
        "explanation": string,
        "marks": number
      }

    TYPE SHAPES (MUST FOLLOW EXACTLY):
    - MULTIPLE_CHOICE: options = string[] (>=3), correctAnswer = string (one of options)
    - TRUE_FALSE: options = ["True","False"], correctAnswer = "True" | "False"
    - SHORT_ANSWER: options omitted, correctAnswer = string
    - LONG_ANSWER: options omitted, correctAnswer = string
    - FILL_BLANKS: options omitted, correctAnswer = string (the missing text)
    - MATCHING: options = array of { "active": string, "passive": string }, correctAnswer = array of strings formatted exactly as "active - passive"
    - ORDERING: options = string[] (unordered list), correctAnswer = string[] (same items in correct order)
    - MATH_PROBLEM: options optional, correctAnswer = string
    - CODING/DIAGRAM: options optional, correctAnswer = string

    EXAMPLES (FORMAT ONLY - DO NOT COPY CONTENT):
    [
      {
        "type": "MULTIPLE_CHOICE",
        "question": "Which sentence is in the passive voice?",
        "options": ["The dog chased the cat.", "The cat was chased by the dog.", "The cat chases the dog."],
        "correctAnswer": "The cat was chased by the dog.",
        "explanation": "In passive voice, the subject receives the action.",
        "marks": 5
      },
      {
        "type": "TRUE_FALSE",
        "question": "Passive voice can be used in present tense.",
        "options": ["True", "False"],
        "correctAnswer": "True",
        "explanation": "Passive voice exists across tenses, including present.",
        "marks": 2
      },
      {
        "type": "SHORT_ANSWER",
        "question": "Convert to passive: 'The chef cooks the meal.'",
        "correctAnswer": "The meal is cooked by the chef.",
        "explanation": "Object becomes the subject; verb becomes 'is cooked'.",
        "marks": 3
      },
      {
        "type": "LONG_ANSWER",
        "question": "Explain when passive voice is preferred over active voice.",
        "correctAnswer": "Passive is preferred when the actor is unknown, unimportant, or to emphasize the action or object.",
        "explanation": "Focus on action/receiver rather than doer.",
        "marks": 10
      },
      {
        "type": "FILL_BLANKS",
        "question": "The book was ____ by the author.",
        "correctAnswer": "written",
        "explanation": "Past participle completes the passive construction.",
        "marks": 2
      },
      {
        "type": "MATCHING",
        "question": "Match active to passive",
        "options": [
          {"active": "The teacher explains the lesson.", "passive": "The lesson is explained by the teacher."},
          {"active": "The dog bit the man.", "passive": "The man was bitten by the dog."}
        ],
        "correctAnswer": [
          "The teacher explains the lesson. - The lesson is explained by the teacher.",
          "The dog bit the man. - The man was bitten by the dog."
        ],
        "explanation": "Active subject becomes agent in passive.",
        "marks": 5
      },
      {
        "type": "ORDERING",
        "question": "Order the steps to convert active to passive.",
        "options": ["Identify the object.", "Use a form of 'to be'.", "Change verb to past participle.", "Move original subject to the end (optional)."],
        "correctAnswer": ["Identify the object.", "Use a form of 'to be'.", "Change verb to past participle.", "Move original subject to the end (optional)."],
        "explanation": "This is the canonical sequence for conversion.",
        "marks": 4
      },
      {
        "type": "MATH_PROBLEM",
        "question": "If x + 5 = 12, what is x?",
        "correctAnswer": "7",
        "explanation": "Subtract 5 from both sides.",
        "marks": 3
      },
      {
        "type": "CODING",
        "question": "What is the output of print(2 * 3 + 1) in Python?",
        "correctAnswer": "7",
        "explanation": "Multiplication before addition: 2*3=6; 6+1=7.",
        "marks": 3
      },
      {
        "type": "DIAGRAM",
        "question": "Name the process where water vapor becomes liquid on a diagram of the water cycle.",
        "correctAnswer": "Condensation",
        "explanation": "Condensation is gas to liquid.",
        "marks": 2
      }
    ]

    Now, generate ${p.questionCount} questions following the shapes above. Remember: output MUST be a raw JSON array only.`;
};

export const generateExamQuestions = async (params: ExamGenerationParams): Promise<any[]> => {
  const client = getAIClient();
  if (!client) {
    throw new Error('AI service not available. Missing API key.');
  }

  const prompt = buildExamPrompt(params);

  const completion = await client.chat.completions.create({
    model: getAIModel(),
    messages: [
      {
        role: 'system',
        content: 'You are an expert educator creating age-appropriate exams. Always return a valid JSON array with no additional text or markdown.'
      },
      {
        role: 'user',
        content: prompt,
      }
    ],
    temperature: 0.7,
    max_tokens: 8000,
  });

  const aiResponse = completion.choices?.[0]?.message?.content || '[]';
  const cleaned = stripCodeFences(aiResponse);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const sample = cleaned.slice(0, 500);
    throw new Error(`AI returned invalid JSON. Sample: ${sample}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI did not return a non-empty JSON array of questions.');
  }

  return parsed;
};

