# Improved Exercise Structure for Auto-Gradable Online Exams

## The Problem with Current Approach
❌ "Write a sentence using passive voice" → Cannot auto-grade
❌ "text_entry" type → Too vague, no validation
❌ Not progressive → Doesn't build to mastery

## Example: English Tenses Course (10 Lessons to Expert Level)

### Lesson Structure (Progressive Mastery)

**Lesson 1: Present Simple - Recognition**
- Step 1: THEORY (What is present simple, when to use)
- Step 2: Multiple choice (identify present simple in sentences)
- Step 3: True/False (is this sentence present simple?)
- Step 4: Fill-in-blank (I ___ to school. → go)
- Step 5: Matching (subject + correct verb form)
- Step 6: QUIZ (mixed recognition)

**Lesson 2: Present Simple - Formation**
- Progressive difficulty with he/she/it rules, negatives, questions

**Lesson 3: Present Continuous - Recognition**
**Lesson 4: Present Continuous - Formation**
**Lesson 5: Past Simple - Recognition & Formation**
**Lesson 6: Past Continuous**
**Lesson 7: Present Perfect**
**Lesson 8: Future Tenses**
**Lesson 9: Mixed Tense Recognition (The Hard Part)**
**Lesson 10: Real-World Application & Mastery Test**

### ONLY Use Auto-Gradable Question Types

#### 1. Multiple Choice (BEST for recognition)
```json
{
  "type": "multiple_choice",
  "question": "Which sentence uses present simple correctly?",
  "options": [
    "A) She is going to school every day",
    "B) She goes to school every day",
    "C) She go to school every day",
    "D) She went to school every day"
  ],
  "correctAnswer": "B",
  "explanation": "Present simple uses base verb + s for he/she/it. 'Goes' is correct."
}
```

#### 2. Fill-in-the-Blank (EXACT match only)
```json
{
  "type": "fill-in-the-blank",
  "question": "He ___ (play) football every weekend.",
  "correctAnswer": "plays",
  "acceptableAnswers": ["plays"], // Only exact matches
  "explanation": "Present simple with he/she/it adds -s to the verb."
}
```

#### 3. Multiple Select (select ALL correct)
```json
{
  "type": "multiple_select",
  "question": "Select ALL sentences in present continuous:",
  "options": [
    "A) I am reading a book",
    "B) She reads books",
    "C) They are playing",
    "D) He played yesterday"
  ],
  "correctAnswers": ["A", "C"],
  "explanation": "Present continuous = am/is/are + verb-ing"
}
```

#### 4. Matching Pairs
```json
{
  "type": "matching",
  "question": "Match the subject with the correct verb form:",
  "pairs": [
    { "left": "I", "right": "go" },
    { "left": "He", "right": "goes" },
    { "left": "They", "right": "go" }
  ],
  "explanation": "Third person singular (he/she/it) adds -s"
}
```

#### 5. Ordering/Sequencing
```json
{
  "type": "ordering",
  "question": "Put these words in the correct order to form a present simple question:",
  "items": ["does", "she", "where", "live", "?"],
  "correctOrder": [2, 0, 1, 3, 4], // "where does she live ?"
  "explanation": "Question word + does + subject + base verb"
}
```

#### 6. Dropdown Selection
```json
{
  "type": "dropdown",
  "question": "I ___ (not/like) coffee.",
  "options": ["don't like", "doesn't like", "am not liking", "didn't like"],
  "correctAnswer": "don't like",
  "explanation": "Present simple negative with I/you/we/they uses 'don't'"
}
```

#### 7. True/False
```json
{
  "type": "true_false",
  "question": "This sentence is grammatically correct: 'She don't likes pizza.'",
  "correctAnswer": "False",
  "explanation": "Should be 'She doesn't like pizza' (doesn't + base verb)"
}
```

## Progressive Difficulty Within Each Lesson

### Early Steps (Recognition)
- "Which sentence is correct?" (multiple choice)
- "Is this present simple? True/False"
- Simple fill-in-blank with obvious context

### Middle Steps (Application)
- Fill-in-blank with tricky subjects (he/she/it)
- Matching exercises
- Negative and question forms

### Late Steps (Mastery)
- Mixed exercises combining multiple rules
- Spot the error (multiple choice with 4 similar options)
- Complex sentences with time markers

## Example: Complete "Present Simple" Lesson

**8 Steps to Mastery:**

1. **THEORY** - Explanation with examples
2. **Recognition (Easy)** - Multiple choice: identify present simple
3. **Formation (Easy)** - Fill-in-blank: basic subjects (I/you)
4. **Formation (Medium)** - Fill-in-blank: tricky subjects (he/she/it)
5. **Negatives** - Multiple choice or dropdown
6. **Questions** - Ordering exercise
7. **Mixed Practice** - Matching or multiple select
8. **Mini-Quiz** - 3-5 mixed questions testing all concepts

## Progression to Expert Level (10 Lessons)

By Lesson 10, students should handle:
- Complex mixed tense identification
- Error correction in professional writing
- Real-world scenarios (emails, news articles)
- Time marker recognition
- Context-based tense selection

All still using AUTO-GRADABLE formats!

## What NOT to Include

❌ "Write a full sentence" - Cannot validate
❌ "Explain why" - Cannot auto-grade
❌ "Give an example" - Too open-ended
❌ Free text without exact answer - Unreliable

## What TO Include

✅ Multiple choice with clear right/wrong
✅ Fill-in-blank with ONE correct answer
✅ Matching with clear pairs
✅ True/False with explanation
✅ Ordering with fixed sequence
✅ Dropdown with limited options
