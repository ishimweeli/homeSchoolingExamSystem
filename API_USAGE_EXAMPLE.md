# 2-Step Course Generation API Usage

## Complete Example: Creating "Passive Voice" Course

### Step 1: Generate Course Outline

**Request:**
```http
POST /api/study-modules/generate-outline
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "subject": "English",
  "gradeLevel": 0,
  "topic": "Passive Voice",
  "difficulty": "medium",
  "lessonCount": 10,
  "country": "GENERAL",
  "includeGamification": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "module": {
      "id": "cm3abc123",
      "title": "Passive Voice Mastery",
      "description": "Complete course on passive voice usage",
      "totalLessons": 10,
      ...
    },
    "outline": [
      {
        "lessonNumber": 1,
        "title": "Introduction to Passive Voice",
        "description": "Learn what passive voice is and when to use it",
        "keyConcepts": ["Definition", "Structure", "Common uses"]
      },
      {
        "lessonNumber": 2,
        "title": "Present Simple Passive",
        "description": "Form and use present simple passive (is/are + past participle)",
        "keyConcepts": ["Formation", "Usage", "Examples"]
      },
      ...8 more lessons
    ]
  },
  "message": "Course outline created with 10 lessons. Generate each lesson individually."
}
```

**What you get:**
- ✅ Module created in database (ID: `cm3abc123`)
- ✅ 10 lesson titles + descriptions
- ✅ User can now edit/review outline
- ⏱️ Takes ~10 seconds
- 💰 Costs ~$0.01

---

### Step 2A: Generate ALL Lessons Automatically (Recommended)

**Request:**
```http
POST /api/study-modules/cm3abc123/generate-all-lessons
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "outline": [
    {
      "lessonNumber": 1,
      "title": "Introduction to Passive Voice",
      "description": "Learn what passive voice is and when to use it",
      "keyConcepts": ["Definition", "Structure", "Common uses"]
    },
    {
      "lessonNumber": 2,
      "title": "Present Simple Passive",
      "description": "Form: is/am/are + past participle",
      "keyConcepts": ["Formation", "Usage", "Examples"]
    },
    ...all 10 lessons
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "module": {...},
    "generatedLessons": [
      {
        "id": "lesson1",
        "lessonNumber": 1,
        "title": "Introduction to Passive Voice",
        "steps": [
          {
            "stepNumber": 1,
            "type": "THEORY",
            "title": "What is Passive Voice?",
            "content": {...}
          },
          {
            "stepNumber": 2,
            "type": "PRACTICE_EASY",
            "title": "Recognition Practice",
            "content": {
              "type": "multiple_choice",
              "question": "Which sentence uses passive voice?",
              "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
              "correctAnswer": "A",
              "explanation": "..."
            }
          },
          ...8 steps total per lesson
        ]
      },
      ...10 lessons total
    ],
    "totalGenerated": 10,
    "totalRequested": 10
  },
  "message": "Generated 10/10 lessons successfully"
}
```

**What happens:**
- 🔄 Generates Lesson 1 → waits 1 sec → Lesson 2 → ... → Lesson 10
- ✅ Each lesson has 8 full steps with exercises
- ✅ Automatically saved to database
- ✅ If one lesson fails, continues with next
- ⏱️ Takes ~3-5 minutes for 10 lessons
- 💰 Costs ~$0.50-0.75

**Console output:**
```
🚀 Starting generation of 10 lessons for "Passive Voice Mastery"
🎓 [1/10] Generating: Introduction to Passive Voice
✅ [1/10] Lesson created with 8 steps
🎓 [2/10] Generating: Present Simple Passive
✅ [2/10] Lesson created with 8 steps
...
🎉 Generation complete! 10/10 lessons created
```

---

### Step 2B: Generate ONE Lesson at a Time (Manual Control)

**Request:**
```http
POST /api/study-modules/cm3abc123/generate-lesson/1
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "lessonTitle": "Introduction to Passive Voice",
  "lessonDescription": "Learn what passive voice is and when to use it",
  "keyConcepts": ["Definition", "Structure", "Common uses"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "lesson1",
    "lessonNumber": 1,
    "title": "Introduction to Passive Voice",
    "content": {
      "theory": "Passive voice is a grammatical construction...",
      "objectives": ["Understand what passive voice is", "Recognize passive constructions", "Know when to use it"],
      "keyTerms": ["passive voice", "agent", "by-phrase", "past participle"],
      "curriculumAlignment": [...]
    },
    "steps": [
      {
        "stepNumber": 1,
        "type": "THEORY",
        ...
      },
      {
        "stepNumber": 2,
        "type": "PRACTICE_EASY",
        "content": {
          "type": "multiple_choice",
          ...
        }
      },
      ...8 steps total
    ]
  },
  "message": "Lesson 1 generated successfully"
}
```

**Then repeat for Lesson 2, 3, 4...**

---

## Database Structure

After completion, your database looks like:

```
StudyModule (cm3abc123)
├── id: cm3abc123
├── title: "Passive Voice Mastery"
├── totalLessons: 10
├── subject: "English"
└── lessons: [
      StudyLesson (Lesson 1)
      ├── id: lesson1
      ├── lessonNumber: 1
      ├── title: "Introduction to Passive Voice"
      ├── content: {...}
      └── steps: [
            StudyStep (Step 1) - THEORY
            StudyStep (Step 2) - PRACTICE_EASY (multiple choice)
            StudyStep (Step 3) - PRACTICE_EASY (fill-in-blank)
            StudyStep (Step 4) - PRACTICE_EASY (true/false)
            StudyStep (Step 5) - PRACTICE_MEDIUM (matching)
            StudyStep (Step 6) - PRACTICE_MEDIUM (multiple choice)
            StudyStep (Step 7) - PRACTICE_HARD (ordering/fill-in-blank)
            StudyStep (Step 8) - QUIZ (mixed)
          ],

      StudyLesson (Lesson 2)
      ├── id: lesson2
      ├── lessonNumber: 2
      ├── title: "Present Simple Passive"
      └── steps: [8 steps],

      ...10 lessons total
    ]
```

---

## Which Method to Use?

### Use "Generate All" when:
- ✅ You trust the outline
- ✅ You want the course completed quickly
- ✅ You're okay with potential minor variations

### Use "Generate One at a Time" when:
- ✅ You want to review each lesson before continuing
- ✅ You want to make adjustments between lessons
- ✅ You're testing/experimenting
- ✅ You want manual control

---

## Error Handling

### If a lesson fails during "Generate All":
```json
{
  "success": true,
  "data": {
    "totalGenerated": 8,
    "totalRequested": 10,
    "errors": [
      {
        "lessonNumber": 3,
        "title": "Past Simple Passive",
        "error": "AI response was incomplete"
      },
      {
        "lessonNumber": 7,
        "title": "Future Passive",
        "error": "Timeout"
      }
    ]
  },
  "message": "Generated 8/10 lessons successfully"
}
```

**Then manually regenerate failed lessons:**
```http
POST /api/study-modules/cm3abc123/generate-lesson/3
POST /api/study-modules/cm3abc123/generate-lesson/7
```

---

## Frontend Implementation (Next)

```tsx
// 1. Generate outline
const outline = await api.generateCourseOutline({...});

// 2. Show outline to user for review/edit

// 3. User clicks "Generate All Lessons"
const result = await api.generateAllLessons(moduleId, outline);

// 4. Show progress:
// Generating lesson 1/10... ✅
// Generating lesson 2/10... ✅
// ...

// 5. Course complete! Redirect to course view
```

---

**This is the PERFECT system!** 🎯
