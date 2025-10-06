# Enhanced Exam Structure Plan

## Problem
Current system cannot handle complex exams like NESA with:
- Multiple sections (A, B, C)
- Subsections within sections
- Question groups (e.g., reading comprehension with multiple sub-questions)
- Different instructions per section
- Complex formatting and nested questions

## Solution: Hierarchical Exam Structure

### New Database Schema

```prisma
model Exam {
  // ... existing fields ...
  sections Section[]
}

model Section {
  id          String   @id @default(cuid())
  examId      String
  exam        Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)

  title       String   // "SECTION A: READING COMPREHENSION"
  code        String   // "A", "B", "C"
  instructions String?  @db.Text
  totalMarks  Int
  order       Int      @default(0)

  subsections Subsection[]
  questions   Question[] // Direct questions without subsection

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([examId])
  @@map("sections")
}

model Subsection {
  id          String   @id @default(cuid())
  sectionId   String
  section     Section  @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  title       String?  // Optional subsection title
  instructions String? @db.Text
  context     String?  @db.Text // For reading passages, etc.
  order       Int      @default(0)

  questionGroups QuestionGroup[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([sectionId])
  @@map("subsections")
}

model QuestionGroup {
  id            String     @id @default(cuid())
  subsectionId  String
  subsection    Subsection @relation(fields: [subsectionId], references: [id], onDelete: Cascade)

  title         String?    // "Reading comprehension questions"
  instructions  String?    @db.Text
  context       String?    @db.Text // Reading passage, scenario, etc.
  totalMarks    Int
  order         Int        @default(0)

  questions     Question[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([subsectionId])
  @@map("question_groups")
}

model Question {
  // ... existing fields ...

  // Link to section OR group
  sectionId       String?
  section         Section? @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  questionGroupId String?
  questionGroup   QuestionGroup? @relation(fields: [questionGroupId], references: [id], onDelete: Cascade)

  // Question numbering
  number          String?  // "1", "a)", "i)", etc.
  parentQuestionId String? // For nested questions
  parentQuestion  Question? @relation("QuestionHierarchy", fields: [parentQuestionId], references: [id])
  subQuestions    Question[] @relation("QuestionHierarchy")
}
```

### Example Structure (NESA Exam)

```
Exam: ENGLISH PE
├── Section A: READING COMPREHENSION (20 marks)
│   ├── Subsection 1
│   │   ├── Context: "FOODS" passage
│   │   └── QuestionGroup 1: Reading comprehension questions (16 marks)
│   │       ├── Question 1: Choose and circle the best alternative
│   │       │   ├── i) What do we need food for?
│   │       │   ├── ii) How many major groups...
│   │       │   └── ... (xvi questions total)
│   │       └── Question 2: Answer in full sentences (4 marks)
│   │           ├── a) What are the two functions...
│   │           └── b) How can we get water...
│   │
├── Section B: VOCABULARY (25 marks)
│   ├── Question 3: Complete the story (5 marks)
│   ├── Question 4: Complete sentences with nouns (5 marks)
│   ├── Question 5: Read passage and circle answers (10 marks)
│   └── Question 6: Match words with opposites (5 marks)
│
└── Section C: LANGUAGE STRUCTURE (40 marks)
    ├── Question 7: Pronouns (5 marks)
    ├── Question 8: Verb forms (10 marks)
    └── ... more questions
```

## Implementation Steps

1. **Database Migration**
   - Add Section, Subsection, QuestionGroup models
   - Update Question model with new relations
   - Create migration script

2. **Backend API Updates**
   - Update exam generation to support sections
   - Add endpoints for section/subsection CRUD
   - Update exam retrieval to include full hierarchy

3. **Frontend Updates**
   - Create section builder UI
   - Add subsection and question group support
   - Update exam display to show hierarchical structure
   - Add PDF export with proper formatting

4. **Exam Display/Taking**
   - Render exams with proper section headers
   - Show instructions per section
   - Handle nested question numbering
   - Calculate marks per section

## Benefits

- ✅ Can replicate exact NESA exam format
- ✅ Flexible structure for any exam type
- ✅ Proper section-wise marking
- ✅ Better organization and clarity
- ✅ Professional exam appearance
- ✅ Easy to export to PDF with formatting
