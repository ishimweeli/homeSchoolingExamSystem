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
    ? `Create a COMPREHENSIVE, CURRICULUM-ALIGNED "Complete Course" for "${topic}" that covers EVERYTHING from ${curriculum.standards} standards. This is a COMPLETE COURSE that follows the official curriculum structure, topics, and subtopics.

    SPECIFICATIONS:
    - Country: ${curriculum.name}
    - Curriculum Standards: ${curriculum.standards}
    - Subject: ${subject}
    - Level: ${gradeLabel} (COMPLETE COURSE - ALL LEVELS)
    - Topic: ${topic}
    - Number of Lessons: ${lessonCount}
    ${includeGamification ? '- Include gamification elements (XP points, achievements, streaks)' : ''}
    ${isPart2 ? `
    
    ⚠️ CRITICAL: This is PART 2 of a split course!
    📋 PART 1 ALREADY COVERED: ${part1Topics}
    
    🚫 DO NOT REPEAT THESE TOPICS! You MUST continue with the NEXT curriculum topics in sequence.
    ➡️ START where Part 1 left off and cover the REMAINING curriculum topics for "${topic}".
    ` : ''}

    🎯 CRITICAL: This is a COMPLETE CURRICULUM-BASED COURSE! Follow the OFFICIAL ${curriculum.standards} structure for "${topic}".
    
    📚 CURRICULUM STRUCTURE (MANDATORY):
    - Base your lessons on the OFFICIAL curriculum topics and subtopics for "${topic}"
    - Follow the standard progression as defined in ${curriculum.standards}
    - Cover ALL key concepts, rules, exceptions, and variations from the curriculum
    - Each lesson = one major curriculum topic/subtopic
    - Include ALL foundational to advanced concepts in proper order
    
    ✅ COMPLETE COVERAGE REQUIRED:
    For "${topic}", you MUST cover (example structure):
    - Lesson 1: Introduction & Fundamentals (curriculum basics)
    - Lessons 2-4: Core Concepts (main curriculum topics)
    - Lessons 5-7: Advanced Concepts (complex curriculum topics)
    - Lessons 8-9: Special Cases & Exceptions (edge cases from curriculum)
    - Lesson 10: Real-World Applications & Mastery (practical application)
    
    📖 Each lesson must follow curriculum subtopics, NOT arbitrary difficulty levels!
    
    ✨ MAKE IT MARKETABLE - Each lesson MUST have:
    1. 📚 ENGAGING theory aligned with curriculum standards
    2. 🎮 8-12 INTERACTIVE exercises (multiple choice, fill-in-blank, matching, ordering, true/false)
    3. 🎯 Mini-quiz after every 2-3 exercises
    4. 💡 Clear curriculum-aligned learning objectives
    5. 🔑 Key terms from the curriculum
    6. 💬 Encouraging feedback messages
    7. 🌟 Tips, tricks, and mnemonics
    
    🚀 CURRICULUM-BASED PROGRESSION:
    - Follow the OFFICIAL ${curriculum.standards} topic sequence for "${topic}"
    - Cover ALL required subtopics in proper curriculum order
    - Progress from foundational concepts to advanced applications as per curriculum
    - Include ALL variations, forms, rules, exceptions, and special cases
    - EACH lesson builds on previous curriculum topics - complete coverage!
    
    🌍 MAKE IT ATTRACTIVE TO PARENTS:
    - Cover ${curriculum.standards} standards COMPLETELY and THOROUGHLY
    - This is a FULL CURRICULUM COURSE worth professional certification
    - Include practical, real-world applications at every level
    - Show clear mastery progression through official curriculum topics
    - Provide exceptional value - this is a COMPLETE COURSE parents will pay premium for!
    
    🎓 LEARNING TYPES (Cover All Students):
    - Visual learners: Rich examples and scenarios
    - Kinesthetic learners: Interactive drag-drop, matching exercises
    - Reading/writing learners: Fill-in-blanks, written exercises
    - Auditory learners: Clear explanations with dialogue examples
    
    📊 COMPREHENSIVE COVERAGE (MANDATORY FOR COMPLETE COURSE):
    For "${topic}", you MUST cover EVERYTHING from the ${curriculum.standards} curriculum:
    - ALL variations, forms, rules, and exceptions
    - Different contexts and applications across ALL levels
    - Common mistakes and how to avoid them
    - Real-world uses (newspapers, conversations, academic writing, technical writing, etc.)
    - Practice for ALL proficiency levels (beginner → expert)
    - Special cases, edge cases, and advanced constructions
    - Historical context and modern usage

    🧭 CURRICULUM ALIGNMENT (MANDATORY - ${curriculum.standards}):
    - Every lesson MUST align with specific ${curriculum.name} ${curriculum.standards} standards
    - In each lesson's content, include a "curriculumAlignment" array of objects:
      [{ "standardCode": "${standardCode}", "description": "Detailed description of curriculum standard covered" }]
    - Use ${curriculum.name}-appropriate examples, contexts, and cultural references
    - Follow ${curriculum.name} official topic sequence and progression
    - Reference specific curriculum codes and standards for each lesson
    
    💎 QUALITY & STEP REQUIREMENTS (MANDATORY - AUTO-GRADABLE ONLY):

    ⚠️ CRITICAL: ONLY use AUTO-GRADABLE question types! NO open-ended questions!
    ❌ NEVER ask: "Write a sentence", "Give an example", "Explain why"
    ✅ ALWAYS use: Multiple choice, Fill-in-blank (exact match), True/False, Matching, Ordering

    Each lesson must contain EXACTLY 8 steps for mastery progression:
      1) THEORY - Explanation with 3-5 clear examples
      2) PRACTICE_EASY - Multiple choice (recognition, 4 options)
      3) PRACTICE_EASY - Fill-in-the-blank (EXACT one-word answer with context)
      4) PRACTICE_EASY - True/False with explanation
      5) PRACTICE_MEDIUM - Matching pairs (4-6 pairs)
      6) PRACTICE_MEDIUM - Multiple choice (harder, similar options)
      7) PRACTICE_HARD - Fill-in-blank or ordering (complex)
      8) QUIZ - Mixed questions combining all concepts from this lesson

    🎯 PROGRESSIVE DIFFICULTY:
    - Steps 2-4: Recognition & basic application (build confidence)
    - Steps 5-6: Deeper practice with variations
    - Steps 7-8: Challenge questions, real-world application

    📋 FILL-IN-THE-BLANK RULES (CRITICAL):
    - Must have EXACTLY ONE correct answer (no variations)
    - Provide strong context so answer is obvious
    - Use format: "He ___ (go) to school every day." with verb hint
    - correctAnswer must be exact: "goes" NOT "go" or "going"
    - Example: "She ___ (be) a doctor." → correctAnswer: "is"

    📋 MULTIPLE CHOICE RULES:
    - Always 4 options (A, B, C, D)
    - Options must be similar enough to be challenging but clearly distinguishable
    - Include common mistakes as distractors
    - Format: "A) option text", "B) option text", etc.
    - correctAnswer: "A" (just the letter)

    📋 MATCHING RULES:
    - Include "pairs" array with 4-6 pairs
    - Format: [{ "left": "item1", "right": "match1" }, ...]
    - Each pair must have ONE clear correct match

    📋 TRUE/FALSE RULES:
    - Statement must be clearly true OR false (no ambiguity)
    - correctAnswer: "True" or "False"
    - Provide detailed explanation why

    📋 ORDERING RULES:
    - "items": ["word1", "word2", "word3", ...]
    - "correctOrder": [2, 0, 1, ...] (array of indices)
    - Use for sentence construction or sequencing

    🚫 BANNED QUESTION TYPES:
    - NO "text_entry" without exact answer
    - NO "Write a sentence using X"
    - NO "Give your own example"
    - NO "Explain in your own words"
    - These CANNOT be auto-graded reliably!

    ✅ SUPPORTED content.type VALUES:
    - "multiple_choice" (4 options, one correct)
    - "fill-in-the-blank" (exact match only)
    - "true_false" (True or False)
    - "matching" (pairs array)
    - "ordering" (items + correctOrder indices)

    Return as JSON with this structure (NO markdown fences, JSON only):
    {
      "title": "Complete Course: [Topic Name] - All Levels",
      "description": "Comprehensive curriculum-aligned course covering all aspects of [topic]",
      "lessons": [{
        "lessonNumber": 1,
        "title": "Lesson Title (Curriculum Topic)",
        "content": {
          "theory": "Brief explanation aligned with curriculum...",
          "objectives": ["Master X", "Understand Y", "Apply Z"],
          "keyTerms": ["term1", "term2", "term3"],
          "curriculumAlignment": [
            { "standardCode": "${standardCode}", "description": "Specific curriculum standard covered" }
          ]
        },
        "steps": [
          {
            "type": "THEORY",
            "title": "Introduction to [Concept]",
            "content": {
              "text": "Theory content with clear explanation...",
              "examples": ["Example 1: concrete scenario", "Example 2: different context", "Example 3: edge case"]
            }
          },
          {
            "type": "PRACTICE_EASY",
            "title": "Recognition Practice",
            "content": {
              "type": "multiple_choice",
              "question": "Which sentence demonstrates [concept] correctly?",
              "options": ["A) Correct example", "B) Common mistake #1", "C) Common mistake #2", "D) Unrelated"],
              "correctAnswer": "A",
              "explanation": "A is correct because... B is wrong because... C is wrong because..."
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
          {
            "type": "PRACTICE_EASY",
            "title": "True or False",
            "content": {
              "type": "true_false",
              "question": "This sentence is correct: 'He go to school.'",
              "correctAnswer": "False",
              "explanation": "With he/she/it, we must add -s: 'He goes to school.'"
            }
          },
          {
            "type": "PRACTICE_MEDIUM",
            "title": "Match the Pairs",
            "content": {
              "type": "matching",
              "question": "Match each subject with its correct verb form:",
              "pairs": [
                { "left": "I", "right": "play" },
                { "left": "He", "right": "plays" },
                { "left": "They", "right": "play" },
                { "left": "She", "right": "plays" }
              ],
              "explanation": "Third person singular (he/she/it) takes -s, all others use base form."
            }
          },
          {
            "type": "PRACTICE_MEDIUM",
            "title": "Choose Correctly",
            "content": {
              "type": "multiple_choice",
              "question": "Select the grammatically correct sentence:",
              "options": ["A) She don't likes pizza", "B) She doesn't like pizza", "C) She doesn't likes pizza", "D) She don't like pizza"],
              "correctAnswer": "B",
              "explanation": "Negative form: doesn't + base verb. A, C, D all have errors."
            }
          },
          {
            "type": "PRACTICE_HARD",
            "title": "Complex Application",
            "content": {
              "type": "ordering",
              "question": "Put these words in order to form a correct question:",
              "items": ["does", "where", "she", "work", "?"],
              "correctOrder": [1, 0, 2, 3, 4],
              "explanation": "Question word + auxiliary + subject + base verb: 'Where does she work?'"
            }
          },
          {
            "type": "QUIZ",
            "title": "Lesson Quiz",
            "content": {
              "type": "multiple_choice",
              "question": "Which sentence uses present simple correctly in all ways?",
              "options": ["A) He don't work here anymore", "B) Does she knows the answer?", "C) They play tennis every weekend", "D) She study hard for exams"],
              "correctAnswer": "C",
              "explanation": "C is correct. A needs 'doesn't', B needs 'know', D needs 'studies'."
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
    
    : `Create a WORLD-CLASS, interactive, Duolingo-style study module for "${topic}" that PARENTS WORLDWIDE will want to buy and students will LOVE learning from.

    SPECIFICATIONS:
    - Country: ${curriculum.name}
    - Curriculum Standards: ${curriculum.standards}
    - Subject: ${subject}
    - Grade Level: ${gradeLabel}
    - Topic: ${topic}
    - Difficulty: ${difficulty}
    - Number of Lessons: ${lessonCount}
    ${includeGamification ? '- Include gamification elements (XP points, achievements, streaks)' : ''}
    ${isPart2 ? `
    
    ⚠️ CRITICAL: This is PART 2 of a split course!
    📋 PART 1 ALREADY COVERED: ${part1Topics}
    
    🚫 DO NOT REPEAT THESE TOPICS! You MUST continue with DIFFERENT topics.
    ➡️ Cover ADVANCED or REMAINING aspects of "${topic}" that Part 1 didn't cover.
    ` : ''}

    🎯 CRITICAL: Create ${lessonCount} COMPLETE, ENGAGING, progressive lessons that make learning "${topic}" FUN and EFFECTIVE for ${gradeLabel} students.
    
    ✨ MAKE IT MARKETABLE - Each lesson MUST have:
    1. 📚 ENGAGING theory with real-world examples
    2. 🎮 6-8 INTERACTIVE exercises (multiple choice, fill-in-blank, matching, ordering, true/false)
    3. 🎯 Mini-quiz after every 2-3 exercises
    4. 💡 Clear learning objectives
    5. 🔑 Key terms with memorable examples
    6. 💬 Encouraging feedback messages
    
    🚀 PROGRESSIVE LEARNING (One Step at a Time):
    - Lesson 1: Start EASY - build confidence with basics
    - Lessons 2-4: Gradually increase difficulty - layer new concepts
    - Lessons 5-7: Intermediate challenges - combine previous knowledge
    - Lessons 8-10: Advanced mastery - real-world application
    - EACH lesson builds on previous ones - NO knowledge gaps!
    
    🌍 MAKE IT ATTRACTIVE TO PARENTS:
    - Cover curriculum standards thoroughly
    - Include practical, real-world applications
    - Show clear learning progression
    - Provide value worth paying for (better than expensive tutoring!)
    - Use engaging, age-appropriate language for ${gradeLabel}
    
    🎓 LEARNING TYPES (Cover All Students):
    - Visual learners: Rich examples and scenarios
    - Kinesthetic learners: Interactive drag-drop, matching exercises
    - Reading/writing learners: Fill-in-blanks, written exercises
    - Auditory learners: Clear explanations with dialogue examples
    
    📊 COMPREHENSIVE COVERAGE:
    For "${topic}", ensure you cover:
    - ALL variations, forms, rules, and exceptions
    - Different contexts and applications
    - Common mistakes and how to avoid them
    - Real-world uses (newspapers, conversations, academic writing, etc.)
    - Practice for different proficiency levels

    🧭 CURRICULUM ALIGNMENT (MANDATORY - ${curriculum.standards}):
    - Align every lesson with ${curriculum.name} ${curriculum.standards} for ${subject} (${gradeLabel})
    - In each lesson's content, include a "curriculumAlignment" array of objects like:
      [{ "standardCode": "${standardCode}", "description": "Recognize and produce passive voice in simple and perfect tenses according to ${curriculum.standards}" }]
    - Use ${curriculum.name}-appropriate examples, contexts, and cultural references
    - Follow ${curriculum.name} grade-level expectations and progression
    
    💎 QUALITY & STEP REQUIREMENTS (MANDATORY - AUTO-GRADABLE ONLY):

    ⚠️ CRITICAL: ONLY use AUTO-GRADABLE question types! NO open-ended questions!
    ❌ NEVER ask: "Write a sentence", "Give an example", "Explain why"
    ✅ ALWAYS use: Multiple choice, Fill-in-blank (exact match), True/False, Matching, Ordering

    Each lesson must contain EXACTLY 8 steps for mastery progression:
      1) THEORY - Explanation with 3-5 clear examples appropriate for ${gradeLabel}
      2) PRACTICE_EASY - Multiple choice (recognition, 4 options)
      3) PRACTICE_EASY - Fill-in-the-blank (EXACT one-word answer with context)
      4) PRACTICE_EASY - True/False with detailed explanation
      5) PRACTICE_MEDIUM - Matching pairs (4-6 pairs)
      6) PRACTICE_MEDIUM - Multiple choice (harder, similar options)
      7) PRACTICE_HARD - Fill-in-blank or ordering (complex scenario)
      8) QUIZ - Mixed questions combining all concepts from this lesson

    🎯 PROGRESSIVE DIFFICULTY (Build to ${difficulty} level):
    - Steps 2-4: Recognition & basic application (build confidence)
    - Steps 5-6: Deeper practice with variations
    - Steps 7-8: Challenge questions at ${difficulty} level, real-world application

    📋 FILL-IN-THE-BLANK RULES (CRITICAL):
    - Must have EXACTLY ONE correct answer (no variations)
    - Provide strong context so answer is obvious
    - Use format: "He ___ (go) to school every day." with verb hint in parentheses
    - correctAnswer must be exact: "goes" NOT "go" or "going"
    - Example: "She ___ (be) a doctor." → correctAnswer: "is"
    - Age-appropriate for ${gradeLabel}

    📋 MULTIPLE CHOICE RULES:
    - Always 4 options (A, B, C, D)
    - Options must be similar enough to be challenging but clearly distinguishable
    - Include common mistakes that ${gradeLabel} students make as distractors
    - Format: "A) option text", "B) option text", etc.
    - correctAnswer: "A" (just the letter)

    📋 MATCHING RULES:
    - Include "pairs" array with 4-6 pairs
    - Format: [{ "left": "item1", "right": "match1" }, ...]
    - Each pair must have ONE clear correct match
    - Use terminology appropriate for ${gradeLabel}

    📋 TRUE/FALSE RULES:
    - Statement must be clearly true OR false (no ambiguity)
    - correctAnswer: "True" or "False"
    - Provide detailed explanation why (teach the concept)

    📋 ORDERING RULES:
    - "items": ["word1", "word2", "word3", ...]
    - "correctOrder": [2, 0, 1, ...] (array of indices showing correct position)
    - Use for sentence construction, sequencing steps, or chronological ordering
    - Make it age-appropriate for ${gradeLabel}

    🚫 BANNED QUESTION TYPES:
    - NO "text_entry" without exact answer
    - NO "Write a sentence using X"
    - NO "Give your own example"
    - NO "Explain in your own words"
    - These CANNOT be auto-graded reliably!

    ✅ SUPPORTED content.type VALUES:
    - "multiple_choice" (4 options, one correct)
    - "fill-in-the-blank" (exact match only)
    - "true_false" (True or False)
    - "matching" (pairs array)
    - "ordering" (items + correctOrder indices)

    🎓 PROGRESSION TO MASTERY:
    By the end of ${lessonCount} lessons, students should be EXPERTS at ${topic}.

    Example progression for "English Tenses" (10 lessons):
    - Lesson 1: Present Simple (recognition & formation)
    - Lesson 2: Present Continuous (is/am/are + verb-ing)
    - Lesson 3: Past Simple (regular & irregular)
    - Lesson 4: Past Continuous (was/were + verb-ing)
    - Lesson 5: Present Perfect (have/has + past participle)
    - Lesson 6: Present Perfect Continuous (have been + verb-ing)
    - Lesson 7: Future Tenses (will, going to, present continuous for future)
    - Lesson 8: Past Perfect & Past Perfect Continuous
    - Lesson 9: Mixed Tense Recognition (the HARD part - identify tense in context)
    - Lesson 10: Real-World Mastery (news articles, emails, complex sentences)

    Follow this progressive model for ALL topics:
    - Lessons 1-3: Individual concepts (one at a time, build confidence)
    - Lessons 4-6: Related concepts (compare/contrast, avoid confusion)
    - Lessons 7-8: Integration (combine multiple concepts)
    - Lessons 9-10: Mastery (mixed problems, real-world application, expert level)
    - Each lesson builds on previous - NO gaps in knowledge!

    Return as JSON with this structure (NO markdown fences, JSON only):
    {
      "title": "Module Title",
      "description": "Module Description",
      "lessons": [{
        "lessonNumber": 1,
        "title": "Lesson Title",
        "content": {
          "theory": "Brief explanation...",
          "objectives": ["Objective 1", "Objective 2"],
          "keyTerms": ["term1", "term2"],
          "curriculumAlignment": [
            { "standardCode": "", "description": "" }
          ]
        },
        "steps": [{
          "type": "THEORY",
          "title": "Introduction",
          "content": {
            "text": "Theory content...",
            "examples": ["example1", "example2"]
          }
        }, {
          "type": "PRACTICE_EASY",
          "title": "Practice",
          "content": {
            "question": "Question text",
            "type": "multiple_choice",
            "options": ["A", "B", "C", "D"],
            "correctAnswer": "A",
            "explanation": "Why this is correct"
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

