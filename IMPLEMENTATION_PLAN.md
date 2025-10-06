# Two-Mode Exam Creation Implementation Plan

## Overview
Support **two exam creation modes**:
1. **Simple Mode**: AI-generated flat structure (existing)
2. **Advanced Mode**: Manual sections with AI assistance (new)

---

## Implementation Strategy

### Phase 1: Database Schema (Add sections support - OPTIONAL)

**Update Question model** to optionally belong to a section:

```prisma
model Exam {
  // ... existing fields ...
  hasAdvancedStructure Boolean @default(false) // Flag for advanced mode
  sections            Section[]
}

model Section {
  id           String   @id @default(cuid())
  examId       String
  exam         Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)

  code         String   // "A", "B", "C"
  title        String   // "READING COMPREHENSION"
  instructions String?  @db.Text
  totalMarks   Int      @default(0)
  order        Int      @default(0)

  questions    Question[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([examId])
  @@map("exam_sections")
}

model Question {
  // ... existing fields ...

  // Optional section link (for advanced mode)
  sectionId    String?
  section      Section? @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  // Question numbering for advanced mode
  questionNumber String? // "1", "a)", "i)", etc.
  context        String? @db.Text // Reading passage or context
}
```

---

### Phase 2: Backend API

#### **2.1 Simple Mode (Existing - Keep as is)**
```typescript
POST /api/exams/generate
{
  "mode": "simple",
  "title": "Math Quiz",
  "questionCount": 20,
  "questionTypes": ["MULTIPLE_CHOICE", "TRUE_FALSE"]
}
```

#### **2.2 Advanced Mode (New)**
```typescript
POST /api/exams/generate-advanced
{
  "mode": "advanced",
  "title": "ENGLISH PE",
  "sections": [
    {
      "code": "A",
      "title": "READING COMPREHENSION",
      "instructions": "Read the passage below...",
      "totalMarks": 20,
      "questions": [
        {
          "context": "FOODS passage text...",
          "type": "MULTIPLE_CHOICE",
          "questionNumber": "1",
          "subQuestions": [
            {
              "questionNumber": "i",
              "question": "What do we need food for?",
              "options": ["To sleep", "To live and grow", ...],
              "correctAnswer": "B",
              "marks": 1
            }
          ]
        }
      ]
    },
    {
      "code": "B",
      "title": "VOCABULARY",
      "totalMarks": 25,
      "useAI": true, // Can still use AI to generate questions
      "aiPrompt": "Generate 5 vocabulary questions for Grade 5"
    }
  ]
}
```

---

### Phase 3: Frontend UI

#### **3.1 Mode Selection Screen**
```jsx
<ExamCreateModeSelector>
  <ModeCard
    title="Simple Mode"
    description="AI generates exam automatically"
    icon="🤖"
    onClick={() => navigate('/exams/create/simple')}
  />
  <ModeCard
    title="Advanced Mode"
    description="Create sections manually with full control"
    icon="⚙️"
    onClick={() => navigate('/exams/create/advanced')}
  />
</ExamCreateModeSelector>
```

#### **3.2 Simple Mode (Existing)**
Keep `ExamCreateProfessional.tsx` as is

#### **3.3 Advanced Mode (New)**
Create `ExamCreateAdvanced.tsx`:

```jsx
<AdvancedExamBuilder>
  {/* Exam Info */}
  <ExamHeader />

  {/* Sections */}
  <SectionList>
    {sections.map(section => (
      <SectionEditor key={section.id}>
        <SectionHeader>
          Section {section.code}: {section.title}
          <Button>Add Question</Button>
          <Button>Generate with AI</Button>
        </SectionHeader>

        <QuestionList>
          {section.questions.map(q => (
            <QuestionEditor
              question={q}
              allowNesting={true}
              allowContext={true}
            />
          ))}
        </QuestionList>
      </SectionEditor>
    ))}
  </SectionList>

  {/* Add Section Button */}
  <Button onClick={addSection}>
    + Add Section
  </Button>
</AdvancedExamBuilder>
```

---

### Phase 4: Exam Display

#### **4.1 Display Logic**
```typescript
if (exam.hasAdvancedStructure) {
  return <AdvancedExamView exam={exam} />
} else {
  return <SimpleExamView exam={exam} />
}
```

#### **4.2 Advanced View**
```jsx
<AdvancedExamView>
  {exam.sections.map(section => (
    <Section key={section.id}>
      <h2>SECTION {section.code}: {section.title}</h2>
      <p>{section.instructions}</p>
      <div className="marks">({section.totalMarks} marks)</div>

      {section.questions.map(q => (
        <Question>
          {q.context && <Context>{q.context}</Context>}
          <QuestionText>{q.questionNumber}) {q.question}</QuestionText>

          {/* Nested sub-questions */}
          {q.subQuestions?.map(sub => (
            <SubQuestion>
              {sub.questionNumber}) {sub.question}
            </SubQuestion>
          ))}
        </Question>
      ))}
    </Section>
  ))}
</AdvancedExamView>
```

---

### Phase 5: PDF Export

#### **5.1 Advanced Mode PDF**
```typescript
function generateAdvancedExamPDF(exam) {
  const doc = new jsPDF();

  // Header
  doc.text(exam.title, 105, 20, { align: 'center' });
  doc.text(`${exam.subject} - Grade ${exam.gradeLevel}`, 105, 30, { align: 'center' });

  let y = 50;

  // Sections
  exam.sections.forEach(section => {
    // Section header
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`SECTION ${section.code}: ${section.title}`, 20, y);
    doc.text(`(${section.totalMarks} marks)`, 180, y);
    y += 10;

    // Instructions
    if (section.instructions) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(section.instructions, 20, y, { maxWidth: 170 });
      y += 15;
    }

    // Questions
    section.questions.forEach(q => {
      // Context/passage
      if (q.context) {
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.text(q.context, 20, y, { maxWidth: 170 });
        y += 20;
      }

      // Question
      doc.setFont(undefined, 'bold');
      doc.text(`${q.questionNumber}) ${q.question}`, 20, y);
      y += 8;

      // Sub-questions
      q.subQuestions?.forEach(sub => {
        doc.setFont(undefined, 'normal');
        doc.text(`  ${sub.questionNumber}) ${sub.question}`, 25, y);
        y += 6;

        // Options for MCQ
        if (sub.options) {
          sub.options.forEach((opt, i) => {
            doc.text(`    ${String.fromCharCode(65 + i)}) ${opt}`, 30, y);
            y += 5;
          });
        }
      });

      y += 10;
    });

    y += 15; // Space between sections
  });

  return doc;
}
```

---

## User Flow

### Simple Mode
```
1. Click "Create Exam"
2. Choose "Simple Mode"
3. Fill basic info (title, subject, grade)
4. Select question types and counts
5. Click "Generate with AI"
6. Review and publish
```

### Advanced Mode
```
1. Click "Create Exam"
2. Choose "Advanced Mode"
3. Fill basic info
4. Click "Add Section" → Section A
5. Add section title and instructions
6. Add questions manually OR click "Generate with AI"
7. Add more sections (B, C, etc.)
8. Preview exam with proper formatting
9. Export to PDF or publish
```

---

## Hybrid Approach (Best of Both)

You can **mix AI and manual**:
- Section A: Generate 10 reading comprehension questions with AI
- Section B: Manually add specific vocabulary exercises
- Section C: Generate 5 grammar questions with AI

---

## Migration Strategy

1. **Keep existing exams working** (simple mode)
2. **Add new tables** for sections
3. **Update UI** to show mode selector
4. **Gradual rollout**: Start with advanced mode for new exams only

---

## Timeline

- **Phase 1**: Database schema - 1 day
- **Phase 2**: Backend API - 2 days
- **Phase 3**: Frontend UI - 3 days
- **Phase 4**: Display & PDF - 2 days
- **Testing**: 2 days

**Total: ~10 days**

---

## Next Steps

Should I:
1. ✅ **Start with database migration** (add sections support)
2. ✅ **Create mode selector UI**
3. ✅ **Build advanced mode builder**
4. ✅ **Add PDF export with formatting**

Let me know and I'll start implementing! 🚀
