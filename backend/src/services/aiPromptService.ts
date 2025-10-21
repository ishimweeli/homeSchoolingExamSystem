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

interface StudyModuleGenerationParams {
  subject: string;
  gradeLevel: number;
  topic: string;
  difficulty: string;
  lessonCount: number;
  includeGamification?: boolean;
  country?: string;
  isPart2?: boolean;
  part1Topics?: string;
  // NEW: Batch generation parameters
  batchStartLesson?: number;
  totalLessonsInCourse?: number;
  previousLessons?: string;
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
    country = 'GENERAL',
    isPart2 = false,
    part1Topics = '',
    // NEW: Batch parameters
    batchStartLesson = 1,
    totalLessonsInCourse = lessonCount,
    previousLessons = '',
  } = params;

  const curriculum = CURRICULUM_MAP[country] || CURRICULUM_MAP['GENERAL'];
  const gradeLabel = getGradeLabel(country, gradeLevel);
  const standardCode = curriculum.exampleStandard(subject, gradeLevel, topic);

  const systemMessage = `You are a WORLD-CLASS educational content creator (Duolingo + Khan Academy + Coursera quality). Your job: produce curriculum-aligned, age-appropriate, interactive lessons based on ${curriculum.name} (${curriculum.standards}) that parents will GLADLY PAY FOR and students will LOVE. Be thorough but FUN. Ensure clear progression, immediate feedback, and multiple learning styles. Avoid filler. Output VALID JSON only. CRITICAL: Use \\n for newlines in string values, never literal newlines or control characters.`;

  const isCompleteGourse = gradeLevel === 0;

  // Build context about previous lessons
  let previousLessonsContext = '';
  if (batchStartLesson > 1 && previousLessons) {
    previousLessonsContext = `
    📚 <b>PREVIOUS LESSONS ALREADY COVERED:</b>
    ${previousLessons}
    
    🚫 <b>DO NOT REPEAT THESE TOPICS!</b> Continue the progression naturally.
    ➡️ You are generating lessons ${batchStartLesson} to ${batchStartLesson + lessonCount - 1} of ${totalLessonsInCourse} total lessons.
    `;
  }

  const lessonRangeInfo = batchStartLesson > 1
    ? `Lessons ${batchStartLesson}-${batchStartLesson + lessonCount - 1} (of ${totalLessonsInCourse} total)`
    : `Lessons 1-${lessonCount} (of ${totalLessonsInCourse} total)`;

  const userPrompt = isCompleteGourse
    ? `Create ${lessonCount} CURRICULUM-ALIGNED lessons for "<b>${topic}</b>" (Complete Course).
    
    ${previousLessonsContext}

    SPECIFICATIONS:
    - Country: ${curriculum.name}
    - Curriculum Standards: ${curriculum.standards}
    - Subject: ${subject}
    - Level: ${gradeLabel} (COMPLETE COURSE)
    - Topic: ${topic}
    - Generating: ${lessonRangeInfo}
    ${includeGamification ? '- Include gamification elements (XP points, achievements, streaks)' : ''}

    🎯 <b>CRITICAL:</b> This is part of a COMPLETE CURRICULUM-BASED COURSE following ${curriculum.standards}.

    🧠 <b>RICH TEXT FORMATTING RULE (MANDATORY)</b>:
    - All <b>theory</b> fields must be formatted in HTML-rich text (<p>, <b>, <i>, <u>, <br>).
    - All <b>objectives</b> must use rich text bullet format with <li> tags.
    - All <b>explanations</b> in exercises must be rich text using <b>, <i>, <u> for emphasis.
    - All <b>learningText</b> must contain AT LEAST 2 FULL PARAGRAPHS (minimum 4-6 sentences each).

    📖 <b>LEARNING TEXT REQUIREMENTS (MANDATORY)</b>:
    Every step with a question MUST include a <b>learningText</b> property:
    - <b>MINIMUM 2 PARAGRAPHS</b> of educational content (wrapped in <p> tags)
    - Each paragraph should be 4-6 sentences explaining the concept thoroughly
    - Use <b>bold</b> for key terms, <i>italics</i> for examples, <u>underline</u> for important rules
    
    📚 <b>CURRICULUM STRUCTURE</b>:
    - Base lessons on OFFICIAL curriculum topics for "${topic}"
    - Follow standard progression from ${curriculum.standards}
    - Each lesson = one major curriculum topic/subtopic
    - Ensure logical progression from lesson ${batchStartLesson}

    ✨ <b>Each lesson must include:</b>
    1. 📚 <b>Engaging theory (rich text, curriculum-aligned)</b>
    2. 🎮 8 <b>interactive exercises with learningText</b>
    3. 💡 <b>Rich text learning objectives</b>
    4. 🔑 <b>Key terms</b>
    5. 💬 <b>Encouraging feedback</b>

    💎 <b>Lesson Format (8 Steps)</b>:
    1) THEORY – rich text with 3–5 examples
    2) PRACTICE_EASY – multiple choice with learningText (2+ paragraphs)
    3) PRACTICE_EASY – fill-in-the-blank with learningText (2+ paragraphs)
    4) PRACTICE_EASY – true/false with learningText (2+ paragraphs)
    5) PRACTICE_MEDIUM – matching pairs with learningText (2+ paragraphs)
    6) PRACTICE_MEDIUM – multiple choice (harder) with learningText (2+ paragraphs)
    7) PRACTICE_HARD – ordering or fill-in-blank with learningText (2+ paragraphs)
    8) QUIZ – mixed questions with learningText (2+ paragraphs)

    ✅ <b>OUTPUT JSON STRUCTURE</b> (no markdown fences, JSON only):
    {
      "lessons": [{
        "lessonNumber": ${batchStartLesson},
        "title": "Lesson Title (Curriculum Topic)",
        "content": {
          "theory": "<p>Rich text explanation aligned with ${curriculum.standards}</p>",
          "objectives": [
            "<li><b>Understand</b> how to...</li>",
            "<li><b>Apply</b> the rule in context.</li>"
          ],
          "keyTerms": ["<b>Term1</b>", "<b>Term2</b>"],
          "curriculumAlignment": [
            { "standardCode": "${standardCode}", "description": "Specific ${curriculum.standards} standard." }
          ]
        },
        "steps": [
          {
            "type": "THEORY",
            "title": "Introduction to [Concept]",
            "content": {
              "text": "<p>Theory with <b>rich text</b> and <i>examples</i>.</p>",
              "examples": ["<i>Example 1</i>", "<i>Example 2</i>", "<i>Example 3</i>"]
            }
          },
          {
            "type": "PRACTICE_EASY",
            "title": "Recognition Practice",
            "content": {
              "learningText": "<p>First paragraph: Detailed explanation...</p><p>Second paragraph: Additional depth...</p>",
              "type": "multiple_choice",
              "question": "Which sentence demonstrates [concept] correctly?",
              "options": ["A) Correct", "B) Wrong", "C) Wrong", "D) Wrong"],
              "correctAnswer": "A",
              "explanation": "<p><b>A</b> is correct because...</p>"
            }
          },
          {
            "type": "PRACTICE_MEDIUM",
            "title": "Matching Pairs",
            "content": {
              "learningText": "<p>First paragraph: Detailed explanation...</p><p>Second paragraph: Additional depth...</p>",
              "type": "matching",
              "pairs": [
                { "left": "Term 1", "right": "Definition 1" },
                { "left": "Term 2", "right": "Definition 2" },
                { "left": "Term 3", "right": "Definition 3" },
                { "left": "Term 4", "right": "Definition 4" }
              ],
              "explanation": "<p>Matches: <b>Term 1 → Definition 1</b>, <b>Term 2 → Definition 2</b>, etc.</p>"
            }
          },
          {
            "type": "PRACTICE_HARD",
            "title": "Complex Application",
            "content": {
              "learningText": "<p>In English question formation, the <b>word order</b> follows a specific pattern. Typically, a <b>question word</b> (like 'where', 'what', 'when') comes first, followed by the <b>auxiliary verb</b> (like 'does', 'do', 'is'), then the <b>subject</b>, and finally the <b>main verb</b>. This structure helps listeners immediately recognize that a question is being asked.</p><p>When rearranging words, always start by identifying the <b>question word</b>. Next, find the <b>helping verb</b> (such as 'does' or 'is'), and then place the <b>subject</b> before the <b>main verb</b>. For example, <i>'Where does she work?'</i> follows this exact pattern.</p>",
              "type": "ordering",
              "question": "Put these words in order to form a correct question:",
              "items": ["does", "where", "she", "work", "?"],
              "correctOrder": ["where", "does", "she", "work", "?"],
              "explanation": "<p>The correct order is <b>'Where does she work?'</b>. The pattern is: <u>Question word + auxiliary + subject + base verb</u>.</p>"
            }
          },
           {
            "type": "PRACTICE_EASY",
            "title": "Fill in the Blank",
            "content": {
              "type": "fill-in-the-blank",
              "question": "She ___ (eat) breakfast every morning.",
              "correctAnswer": "eats",
              "explanation": "Present simple with she/he/it adds -s to the verb."
            }
          },
        ]
      }]
    }`
    : `Create ${lessonCount} WORLD-CLASS, rich-text lessons for "<b>${topic}</b>".

    ${previousLessonsContext}

    SPECIFICATIONS:
    - Country: ${curriculum.name}
    - Subject: ${subject}
    - Grade: ${gradeLabel}
    - Topic: ${topic}
    - Difficulty: ${difficulty}
    - Generating: ${lessonRangeInfo}
    ${includeGamification ? '- Include gamification elements' : ''}

    🎯 <b>RICH TEXT REQUIREMENTS (MANDATORY)</b>:
    - <b>Theory</b>, <b>Objectives</b>, <b>Explanations</b>, and <b>learningText</b> must all use HTML-rich text.
    - <b>learningText MUST contain AT LEAST 2 PARAGRAPHS</b> (4-6 sentences each)

    📖 <b>LEARNING TEXT REQUIREMENTS (MANDATORY)</b>:
    Every practice step MUST include <b>learningText</b> with:
    - Minimum 2 full paragraphs (each 4-6 sentences) wrapped in <p> tags
    - Use <b>bold</b> for key terms, <i>italics</i> for examples, <u>underline</u> for rules

    💎 <b>Lesson Format (8 Steps)</b>:
    1) THEORY – rich text with 3–5 examples
    2) PRACTICE_EASY – multiple choice with learningText
    3) PRACTICE_EASY – fill-in-the-blank with learningText
    4) PRACTICE_EASY – true/false with learningText
    5) PRACTICE_MEDIUM – matching with learningText
    6) PRACTICE_MEDIUM – multiple choice (advanced) with learningText
    7) PRACTICE_HARD – ordering or complex fill-in with learningText
    8) QUIZ – mixed review with learningText

    ✅ <b>OUTPUT JSON STRUCTURE</b>:
    {
      "lessons": [{
        "lessonNumber": ${batchStartLesson},
        "title": "Lesson Title",
        "content": {
          "theory": "<p>Rich text with <b>key ideas</b> and <i>examples</i>.</p>",
          "objectives": ["<li><b>Recognize</b> ${topic}</li>"],
          "keyTerms": ["<b>Term1</b>"],
          "curriculumAlignment": [{ "standardCode": "", "description": "Aligned with ${curriculum.standards}." }]
        },
        "steps": [{
          "type": "THEORY",
          "title": "Introduction",
          "content": {
            "text": "<p>Theory content</p>",
            "examples": ["<i>Example 1</i>"]
          }
        }, {
          "type": "PRACTICE_EASY",
          "title": "Practice",
          "content": {
            "learningText": "<p>First paragraph...</p><p>Second paragraph...</p>",
            "question": "Which is correct?",
            "type": "multiple_choice",
            "options": ["A) ...", "B) ..."],
            "correctAnswer": "A",
            "explanation": "<p><b>A</b> is correct...</p>"
          }
        }, {
          "type": "PRACTICE_MEDIUM",
          "title": "Matching Pairs",
          "content": {
            "learningText": "<p>First paragraph: Detailed explanation...</p><p>Second paragraph: Additional depth...</p>",
            "type": "matching",
            "pairs": [
              { "left": "go", "right": "went" },
              { "left": "watch", "right": "watched" },
              { "left": "have", "right": "had" },
              { "left": "stop", "right": "stopped" }
            ],
            "explanation": "<p>Matches: <b>go → went</b>, <b>watch → watched</b> (regular, add <u>-ed</u>), <b>have → had</b> (irregular), <b>stop → stopped</b> (regular with doubled consonant).</p>"
          }
        }, {
          "type": "PRACTICE_HARD",
          "title": "Complex Application",
          "content": {
            "learningText": "<p>In English question formation, the <b>word order</b> follows a specific pattern. Typically, a <b>question word</b> (like 'where', 'what', 'when') comes first, followed by the <b>auxiliary verb</b> (like 'does', 'do', 'is'), then the <b>subject</b>, and finally the <b>main verb</b>. This structure helps listeners immediately recognize that a question is being asked.</p><p>When rearranging words, always start by identifying the <b>question word</b>. Next, find the <b>helping verb</b> (such as 'does' or 'is'), and then place the <b>subject</b> before the <b>main verb</b>. For example, <i>'Where does she work?'</i> follows this exact pattern.</p>",
            "type": "ordering",
            "question": "Put these words in order to form a correct question:",
            "items": ["does", "where", "she", "work", "?"],
            "correctOrder": [1, 0, 2, 3, 4],
            "explanation": "<p>The correct order is <b>'Where does she work?'</b>. The pattern is: <u>Question word + auxiliary + subject + base verb</u>.</p>"
          }
        }]
      }]
    }`;

  // Reduced token count for smaller batches (2 lessons at a time)
  const maxTokens = 12000; // Sufficient for 2 detailed lessons

  return {
    systemMessage,
    userPrompt,
    temperature: 0.8,
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

