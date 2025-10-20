/**
 * AI Prompt Service
 * Centralized service for generating AI prompts for various educational content
 */

// Country-specific curriculum mappings
interface CountryCurriculum {
  name: string;
  standards: string;
  gradeLabel: string;
  exampleStandard: (subject: string, grade: number, topic: string) => string;
}

// Helper function to get grade label for any country
function getGradeLabel(country: string, grade: number): string {
  // All levels (complete course)
  if (grade === 0) {
    return `All Levels (Complete Course)`;
  }

  // University is the same for all countries - just "University"
  if (grade > 12) {
    return `University`;
  }

  // K-12 labels by country
  switch (country) {
    case 'RWANDA':
      if (grade <= 6) return `P${grade} (Primary ${grade})`;
      return `S${grade - 6} (Secondary ${grade - 6})`;
    case 'UK':
    case 'AUSTRALIA':
    case 'NEW_ZEALAND':
      return `Year ${grade}`;
    case 'USA':
    case 'GENERAL':
    default:
      return `Grade ${grade}`;
  }
}

const CURRICULUM_MAP: Record<string, CountryCurriculum> = {
  USA: {
    name: 'United States',
    standards: 'Common Core State Standards (CCSS)',
    gradeLabel: 'Grade',
    exampleStandard: (subject, grade, topic) => {
      if (grade === 0) return `USA.ALL.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
      if (grade > 12) return `USA.UNI.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
      return `CCSS.ELA-LITERACY.L.${grade}.${topic.replace(/\s+/g, '').toUpperCase().substring(0, 3)}`;
    }
  },
  UK: {
    name: 'United Kingdom',
    standards: 'National Curriculum',
    gradeLabel: 'Year',
    exampleStandard: (subject, grade, topic) => {
      if (grade === 0) return `UK.ALL.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
      if (grade > 12) return `UK.UNI.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
      return `NC.KS${grade <= 2 ? '1' : grade <= 6 ? '2' : grade <= 9 ? '3' : '4'}.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
    }
  },
  AUSTRALIA: {
    name: 'Australia',
    standards: 'Australian Curriculum (ACARA)',
    gradeLabel: 'Year',
    exampleStandard: (subject, grade, topic) => {
      if (grade === 0) return `AUS.ALL.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
      if (grade > 12) return `AUS.UNI.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
      return `ACARA.${subject.toUpperCase()}.Y${grade}.${topic.replace(/\s+/g, '').toUpperCase().substring(0, 4)}`;
    }
  },
  NEW_ZEALAND: {
    name: 'New Zealand',
    standards: 'New Zealand Curriculum (NZC)',
    gradeLabel: 'Year',
    exampleStandard: (subject, grade, topic) => {
      if (grade === 0) return `NZ.ALL.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
      if (grade > 12) return `NZ.UNI.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
      return `NZC.${subject.toUpperCase()}.L${Math.ceil(grade / 2)}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
    }
  },
  RWANDA: {
    name: 'Rwanda',
    standards: 'Rwanda Basic Education Competence-Based Curriculum (CBC)',
    gradeLabel: 'Grade',
    exampleStandard: (subject, grade, topic) => {
      if (grade === 0) return `RW.CBC.ALL.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
      let level;
      if (grade <= 6) level = `P${grade}`;
      else if (grade <= 12) level = `S${grade - 6}`;
      else level = `UNI`;
      return `RW.CBC.${subject.toUpperCase()}.${level}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
    }
  },
  GENERAL: {
    name: 'General (International)',
    standards: 'International Standards (USA-based)',
    gradeLabel: 'Grade',
    exampleStandard: (subject, grade, topic) => {
      if (grade === 0) return `GEN.ALL.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
      if (grade > 12) return `GEN.UNI.${subject.toUpperCase()}.${topic.replace(/\s+/g, '').substring(0, 4)}`;
      return `GEN.${subject.toUpperCase()}.G${grade}.${topic.replace(/\s+/g, '').toUpperCase().substring(0, 4)}`;
    }
  }
};

export interface StudyModuleGenerationParams {
  subject: string;
  gradeLevel: number; // 0 = All levels, 1-13 (1-12 for K-12, 13 for University)
  topic: string;
  difficulty: string;
  lessonCount: number;
  includeGamification?: boolean;
  country?: string; // USA, UK, AUSTRALIA, NEW_ZEALAND, RWANDA, GENERAL
  isPart2?: boolean; // Flag indicating this is Part 2 of a split course
  part1Topics?: string; // Comma-separated list of topics covered in Part 1
}

export interface AIPromptConfig {
  systemMessage: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Generate AI prompt configuration for study module creation
 */
export function generateStudyModulePrompt(params: StudyModuleGenerationParams): AIPromptConfig {
  const {
    subject,
    gradeLevel,
    topic,
    difficulty,
    lessonCount,
    includeGamification = false,
    country = 'GENERAL', // Default to GENERAL (International)
    isPart2 = false,
    part1Topics = '',
  } = params;

  // Get country-specific curriculum info
  const curriculum = CURRICULUM_MAP[country] || CURRICULUM_MAP['GENERAL'];
  const gradeLabel = getGradeLabel(country, gradeLevel);

  const standardCode = curriculum.exampleStandard(subject, gradeLevel, topic);

  const systemMessage = `You are a WORLD-CLASS educational content creator (Duolingo + Khan Academy + Coursera quality). Your job: produce curriculum-aligned, age-appropriate, interactive lessons based on ${curriculum.name} (${curriculum.standards}) that parents will GLADLY PAY FOR and students will LOVE. Be thorough but FUN. Ensure clear progression, immediate feedback, and multiple learning styles. Avoid filler. Output VALID JSON only. CRITICAL: Use \\n for newlines in string values, never literal newlines or control characters.`;

  // Different prompt structure based on grade level
  const isCompleteGourse = gradeLevel === 0;

  const userPrompt = isCompleteGourse
    ? `Create a COMPREHENSIVE, CURRICULUM-ALIGNED "Complete Course" for "<b>${topic}</b>" that covers <b>EVERYTHING</b> from ${curriculum.standards} standards. This is a <b>COMPLETE COURSE</b> that follows the official curriculum structure, topics, and subtopics.

    SPECIFICATIONS:
    - Country: ${curriculum.name}
    - Curriculum Standards: ${curriculum.standards}
    - Subject: ${subject}
    - Level: ${gradeLabel} (COMPLETE COURSE - ALL LEVELS)
    - Topic: ${topic}
    - Number of Lessons: ${lessonCount}
    ${includeGamification ? '- Include gamification elements (XP points, achievements, streaks)' : ''}
    ${isPart2 ? `
    
    ⚠️ <b>CRITICAL:</b> This is <b>PART 2</b> of a split course!
    📋 PART 1 ALREADY COVERED: ${part1Topics}
    
    🚫 DO NOT REPEAT THESE TOPICS! You MUST continue with the NEXT curriculum topics in sequence.
    ➡️ START where Part 1 left off and cover the REMAINING curriculum topics for "<b>${topic}</b>".
    ` : ''}

    🎯 <b>CRITICAL:</b> This is a COMPLETE CURRICULUM-BASED COURSE! Follow the OFFICIAL ${curriculum.standards} structure for "<b>${topic}</b>".

    🧠 <b>RICH TEXT FORMATTING RULE (MANDATORY)</b>:
    - All <b>theory</b> fields must be formatted in HTML-rich text (<p>, <b>, <i>, <u>, <br>).
    - All <b>objectives</b> must use rich text bullet format with <li> tags.
    - All <b>explanations</b> in exercises must be rich text using <b>, <i>, <u> for emphasis and clarity.
    - JSON values must remain strings (no markdown fences, no escaping of tags).

    📚 <b>CURRICULUM STRUCTURE (MANDATORY)</b>:
    - Base lessons on OFFICIAL curriculum topics and subtopics for "<b>${topic}</b>"
    - Follow the standard progression as defined in ${curriculum.standards}
    - Each lesson = one major curriculum topic/subtopic
    - Include foundational → advanced concepts in proper order

    ✅ <b>COMPLETE COVERAGE REQUIRED</b>:
    Example:
    - Lesson 1: <b>Introduction & Fundamentals</b>
    - Lessons 2–4: <b>Core Concepts</b>
    - Lessons 5–7: <b>Advanced Concepts</b>
    - Lessons 8–9: <b>Special Cases & Exceptions</b>
    - Lesson 10: <b>Real-World Applications & Mastery</b>

    ✨ <b>Each lesson must include:</b>
    1. 📚 <b>Engaging theory (rich text, curriculum-aligned)</b>
    2. 🎮 8–12 <b>interactive exercises</b>
    3. 🎯 <b>Mini-quiz</b> after every 2–3 exercises
    4. 💡 <b>Rich text learning objectives</b>
    5. 🔑 <b>Key terms</b>
    6. 💬 <b>Encouraging feedback</b>
    7. 🌟 <b>Tips, tricks, mnemonics</b>

    🚀 <b>CURRICULUM-BASED PROGRESSION</b>:
    - Follow official topic sequence
    - Cover all required subtopics in curriculum order
    - Build lessons progressively with full coverage

    💎 <b>QUALITY RULES (AUTO-GRADABLE ONLY)</b>:
    - Use only multiple_choice, fill-in-the-blank, true_false, matching, ordering
    - Explanations must be in <b>rich text</b> form with <b>, <i>, <u> tags

    Each lesson = exactly 8 steps:
      1) THEORY - Rich text explanation with 3–5 examples
      2) PRACTICE_EASY - multiple choice
      3) PRACTICE_EASY - fill-in-the-blank
      4) PRACTICE_EASY - true/false
      5) PRACTICE_MEDIUM - matching pairs
      6) PRACTICE_MEDIUM - multiple choice (harder)
      7) PRACTICE_HARD - fill-in-blank or ordering
      8) QUIZ - mixed questions

    📋 <b>EXPLANATION FORMATTING (MANDATORY)</b>:
    - Wrap each explanation in <p> tags
    - Use <b>bold</b> for correct answers, <i>italics</i> for examples, <u>underline</u> for rules
    - Example:
      "<p><b>A</b> is correct because it follows the present simple rule. <u>B</u> is incorrect due to missing -s.</p>"

    ✅ <b>OUTPUT JSON STRUCTURE</b> (no markdown fences, JSON only):
    {
      "title": "Complete Course: ${topic} - All Levels",
      "description": "Comprehensive, rich-text, curriculum-aligned course covering all aspects of ${topic}.",
      "lessons": [{
        "lessonNumber": 1,
        "title": "Lesson Title (Curriculum Topic)",
        "content": {
          "theory": "<p>Rich text explanation aligned with ${curriculum.standards}, using <b>, <i>, and <u> where appropriate.</p>",
          "objectives": [
            "<li><b>Understand</b> how to...</li>",
            "<li><b>Apply</b> the rule in context.</li>"
          ],
          "keyTerms": ["<b>Term1</b>", "<b>Term2</b>"],
          "curriculumAlignment": [
            { "standardCode": "${standardCode}", "description": "Specific ${curriculum.standards} standard covered." }
          ]
        },
        "steps": [
          {
            "type": "THEORY",
            "title": "Introduction to [Concept]",
            "content": {
              "text": "<p>Theory explanation in <b>rich text</b> with <i>examples</i> and <u>rules</u>.</p>",
              "examples": ["<i>Example 1:</i> correct use", "<i>Example 2:</i> variation", "<i>Example 3:</i> exception"]
            }
          },
          {
            "type": "PRACTICE_EASY",
            "title": "Recognition Practice",
            "content": {
              "type": "multiple_choice",
              "question": "Which sentence demonstrates [concept] correctly?",
              "options": ["A) Correct example", "B) Common mistake", "C) Variation", "D) Unrelated"],
              "correctAnswer": "A",
              "explanation": "<p><b>A</b> is correct because it follows the rule. <u>B</u> and <u>C</u> are incorrect due to wrong tense usage.</p>"
            }
          }
        ]
      }],
      "xpRewards": {
        "perLesson": 15,
        "completion": 200
      },
      "badges": ["Curriculum Beginner", "Curriculum Intermediate", "Curriculum Expert", "Master"]
    }`


    : `Create a WORLD-CLASS, rich-text, Duolingo-style interactive module for "<b>${topic}</b>" that PARENTS will buy and STUDENTS will LOVE learning from.

    SPECIFICATIONS:
    - Country: ${curriculum.name}
    - Curriculum Standards: ${curriculum.standards}
    - Subject: ${subject}
    - Grade Level: ${gradeLabel}
    - Topic: ${topic}
    - Difficulty: ${difficulty}
    - Number of Lessons: ${lessonCount}
    ${includeGamification ? '- Include gamification elements (XP, achievements, streaks)' : ''}
    ${isPart2 ? `
    
    ⚠️ <b>PART 2</b> of split module! Previously covered: ${part1Topics}
    🚫 Do not repeat topics. Continue with new ones.
    ` : ''}

    🎯 <b>RICH TEXT REQUIREMENTS (MANDATORY)</b>:
    - <b>Theory</b>, <b>Objectives</b>, and <b>Explanations</b> must all use HTML-rich text (<b>, <i>, <u>, <p>).
    - Format explanations like:
      "<p><b>Correct:</b> because... <i>Incorrect:</i> violates rule...</p>"

    💎 <b>Lesson Format (8 Steps)</b>:
    1) THEORY – rich text with 3–5 examples
    2) PRACTICE_EASY – multiple choice
    3) PRACTICE_EASY – fill-in-the-blank
    4) PRACTICE_EASY – true/false
    5) PRACTICE_MEDIUM – matching
    6) PRACTICE_MEDIUM – multiple choice (advanced)
    7) PRACTICE_HARD – ordering or complex fill-in
    8) QUIZ – mixed review

    ✅ <b>OUTPUT JSON STRUCTURE</b>:
    {
      "title": "Module Title",
      "description": "Rich-text interactive module on ${topic}.",
      "lessons": [{
        "lessonNumber": 1,
        "title": "Lesson Title",
        "content": {
          "theory": "<p>Rich text explanation with <b>key ideas</b> and <i>examples</i>.</p>",
          "objectives": [
            "<li><b>Recognize</b> and <b>use</b> ${topic} correctly.</li>",
            "<li><b>Apply</b> ${topic} in real contexts.</li>"
          ],
          "keyTerms": ["<b>Term1</b>", "<b>Term2</b>"],
          "curriculumAlignment": [
            { "standardCode": "", "description": "Aligned with ${curriculum.standards}." }
          ]
        },
        "steps": [{
          "type": "THEORY",
          "title": "Introduction",
          "content": {
            "text": "<p>Theory content with <b>rules</b>, <i>examples</i>, and <u>exceptions</u>.</p>",
            "examples": ["<i>Example 1:</i> simple case", "<i>Example 2:</i> advanced usage"]
          }
        }, {
          "type": "PRACTICE_EASY",
          "title": "Practice",
          "content": {
            "question": "Which sentence is correct?",
            "type": "multiple_choice",
            "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
            "correctAnswer": "A",
            "explanation": "<p><b>A</b> is correct because... <i>B</i> and <i>C</i> are wrong due to rule violation.</p>"
          }
        }]
      }],
      "xpRewards": {
        "perLesson": 10,
        "completion": 100
      },
      "badges": ["Beginner", "Intermediate", "Expert"]
    }`;

  // Adaptive max_tokens based on course type
  // Reduced to prevent OpenRouter API timeouts and incomplete JSON responses
  // For large courses, the split-and-merge strategy (line 162+) handles >12 lessons
  // - Complete Course (grade 0): Use 25K tokens per request (safe for 10-12 lessons)
  // - Regular grade courses: Use 20K tokens for focused lessons
  const maxTokens = isCompleteGourse ? 25000 : 20000;

  return {
    systemMessage,
    userPrompt,
    temperature: 0.8, // Balanced creativity for educational variety
    maxTokens,
  };
}

/**
 * Generate AI prompt for exam question generation
 * Can be extended in the future for exam creation
 */
export function generateExamQuestionPrompt(params: {
  subject: string;
  gradeLevel: number;
  topic: string;
  questionCount: number;
  difficulty: string;
}): AIPromptConfig {
  const { subject, gradeLevel, topic, questionCount, difficulty } = params;

  const systemMessage = `You are an expert exam creator with deep knowledge of educational standards and assessment best practices. Create high-quality, fair, and educationally sound exam questions.`;

  const userPrompt = `Create ${questionCount} exam questions for:
    - Subject: ${subject}
    - Grade Level: ${gradeLevel}
    - Topic: ${topic}
    - Difficulty: ${difficulty}
    
    Ensure questions are clear, fair, and aligned with grade-level standards.`;

  return {
    systemMessage,
    userPrompt,
    temperature: 0.7,
    maxTokens: 8192,
  };
}

/**
 * Generate AI prompt for content improvement/editing
 * Can be used to refine existing educational content
 */
export function generateContentImprovementPrompt(params: {
  content: string;
  improvementType: 'clarity' | 'engagement' | 'accuracy' | 'age-appropriate';
  gradeLevel?: number;
}): AIPromptConfig {
  const { content, improvementType, gradeLevel } = params;

  const improvementMessages = {
    clarity: 'Make this content clearer and easier to understand',
    engagement: 'Make this content more engaging and interesting for students',
    accuracy: 'Review and improve the accuracy of this educational content',
    'age-appropriate': `Make this content more appropriate for Grade ${gradeLevel || 5} students`,
  };

  const systemMessage = `You are an expert educational content editor. Improve educational content while maintaining accuracy and pedagogical effectiveness.`;

  const userPrompt = `${improvementMessages[improvementType]}:

${content}

Return the improved version.`;

  return {
    systemMessage,
    userPrompt,
    temperature: 0.6,
    maxTokens: 4096,
  };
}

