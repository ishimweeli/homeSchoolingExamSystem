import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { getAIClient, isAIAvailable } from '../utils/aiClient';

export const gradeExamWithAI = async (
  questions: any[],
  answers: Record<string, string>
) => {
  if (!isAIAvailable()) {
    throw new Error('AI client not available - please configure OPENROUTER_API_KEY');
  }

  const aiClient = getAIClient();
  if (!aiClient) {
    throw new Error('Failed to initialize AI client');
  }

  const questionsToGrade = questions.map(q => {
    let correctAnswer = q.correctAnswer;
    if (typeof correctAnswer === 'string' && (correctAnswer.startsWith('"') || correctAnswer.startsWith('['))) {
      try {
        correctAnswer = JSON.parse(correctAnswer);
      } catch (e) {}
    }

    return {
      id: q.id,
      question: q.question,
      type: q.type,
      correctAnswer: correctAnswer,
      studentAnswer: answers[q.id] || 'No answer provided',
      maxMarks: q.marks
    };
  });

  const gradingPrompt = `You are grading student exam answers. Evaluate each answer intelligently and provide:
1. A score out of the maximum marks
2. Whether the answer is correct, partially correct, or incorrect
3. Detailed feedback explaining your grading

Grading Guidelines:
- Multiple Choice: 0 or full marks only (exact match)
- True/False: 0 or full marks only (exact match)
- Short Answer: Give PARTIAL credit based on:
  * Full marks if meaning is correct (minor case/punctuation issues ok)
  * -10% to -20% of marks for capitalization errors ONLY if it affects meaning (e.g., proper nouns)
  * -10% for minor punctuation issues
  * Partial credit (30-70%) for partially correct content
  * Consider synonyms and variations
  * EXPLAIN in feedback what caused deduction
- Long Answer/Essay: Grade based on completeness, accuracy, understanding, and key points covered. Give partial credit generously.
- Fill in Blanks: 
  * Full marks if correct (ignore case/punctuation for common words)
  * -10% to -20% for capitalization of proper nouns
  * Partial credit for spelling variations or synonyms
  * EXPLAIN in feedback

Be fair, encouraging, and DETAILED in your feedback. Always explain why marks were deducted and what was expected.

Questions to grade:
${JSON.stringify(questionsToGrade, null, 2)}

Respond in JSON format exactly like this:
[
  {
    "questionId": "question_id_here",
    "score": number,
    "maxScore": number,
    "status": "correct" | "partial" | "incorrect",
    "feedback": "Detailed explanation of why this score was given"
  }
]`;

  try {
    const completion = await aiClient.chat.completions.create({
      model: process.env.AI_MODEL || 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert teacher grading student exams. Be fair, encouraging, and provide constructive feedback. Recognize partial understanding and effort.'
        },
        { role: 'user', content: gradingPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = completion.choices[0].message.content || '[]';
    const aiGrading = JSON.parse(content);

    return aiGrading;
  } catch (error) {
    console.error('AI grading error:', error);
    throw error;
  }
};

export const submitExamWithAIGrading = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { attemptId, answers } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get attempt with exam questions
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!attempt || attempt.studentId !== (req as any).user.id) {
      return res.status(403).json({
        success: false,
        message: 'Invalid attempt',
      });
    }

    // Handle both answer formats (array or object)
    const answerMap = Array.isArray(answers)
      ? answers.reduce((acc, ans) => ({ ...acc, [ans.questionId]: ans.answer }), {})
      : answers;

    let totalScore = 0;
    const answerData = [];
    let gradingResults = [];
    let aiGradingUsed = false;

    // Try AI grading first
    try {
      const aiResults = await gradeExamWithAI(attempt.exam.questions, answerMap);
      aiGradingUsed = true;

      // Process AI grading results
      console.log('AI Grading Results:', JSON.stringify(aiResults, null, 2));
      for (const question of attempt.exam.questions) {
        const aiResult = aiResults.find((r: any) => r.questionId === question.id) || {
          score: 0,
          maxScore: question.marks,
          status: 'incorrect',
          feedback: 'Unable to grade this question'
        };

        const studentAnswer = answerMap[question.id] || '';
        console.log(`Question ${question.id}: AI Score = ${aiResult.score}, Max = ${aiResult.maxScore}`);
        totalScore += aiResult.score;

        gradingResults.push({
          questionId: question.id,
          question: question.question,
          studentAnswer: studentAnswer,
          score: aiResult.score,
          maxScore: aiResult.maxScore,
          status: aiResult.status,
          feedback: aiResult.feedback
        });

        answerData.push({
          attemptId,
          questionId: question.id,
          answer: studentAnswer,
          finalScore: aiResult.score,
          aiFeedback: aiResult.feedback
        });
      }
    } catch (aiError) {
      console.error('AI grading failed, falling back to exact matching:', aiError);

      // Fallback to exact matching
      for (const question of attempt.exam.questions) {
        const studentAnswer = answerMap[question.id] || '';
        let correctAnswer = question.correctAnswer;

        if (typeof correctAnswer === 'string' && (correctAnswer.startsWith('"') || correctAnswer.startsWith('['))) {
          try {
            correctAnswer = JSON.parse(correctAnswer);
          } catch (e) {}
        }

        const isCorrect = String(studentAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
        const marksAwarded = isCorrect ? question.marks : 0;
        totalScore += marksAwarded;

        gradingResults.push({
          questionId: question.id,
          question: question.question,
          studentAnswer: studentAnswer,
          score: marksAwarded,
          maxScore: question.marks,
          status: isCorrect ? 'correct' : 'incorrect',
          feedback: isCorrect ? 'Correct answer!' : `Incorrect. The correct answer is: ${correctAnswer}`
        });

        answerData.push({
          attemptId,
          questionId: question.id,
          answer: studentAnswer,
          finalScore: marksAwarded,
          aiFeedback: isCorrect ? 'Correct answer!' : `Incorrect. Expected: ${correctAnswer}`
        });
      }
    }

    // Save answers to database
    await prisma.answer.createMany({
      data: answerData,
      skipDuplicates: true
    });

    // Calculate final grade
    console.log('Total Score:', totalScore);
    console.log('Total Marks:', attempt.exam.totalMarks);
    const percentage = attempt.exam.totalMarks > 0 ? (totalScore / attempt.exam.totalMarks) * 100 : 0;
    console.log('Calculated Percentage:', percentage);
    const grade =
      percentage >= 90 ? 'A+' :
      percentage >= 80 ? 'A' :
      percentage >= 70 ? 'B' :
      percentage >= 60 ? 'C' :
      percentage >= 50 ? 'D' : 'F';

    // Update attempt
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        isCompleted: true,
        submittedAt: new Date(),
        timeSpent: Math.round((Date.now() - attempt.startedAt.getTime()) / 60000),
        isGraded: true
      },
    });

    // Increment attempts used in the assignment
    await prisma.examAssignment.updateMany({
      where: {
        examId: attempt.examId,
        studentId: attempt.studentId
      },
      data: {
        attemptsUsed: {
          increment: 1
        }
      }
    });

    // Save grade
    await prisma.grade.upsert({
      where: {
        attemptId: attemptId
      },
      update: {
        totalScore,
        percentage,
        grade,
        aiAnalysis: aiGradingUsed ? gradingResults : undefined,
        overallFeedback: generateOverallFeedback(percentage, grade, gradingResults),
        isPublished: true,
        status: 'COMPLETED',
        gradedAt: new Date()
      },
      create: {
        attemptId,
        studentId: (req as any).user.id,
        totalScore,
        percentage,
        grade,
        aiAnalysis: aiGradingUsed ? gradingResults : undefined,
        overallFeedback: generateOverallFeedback(percentage, grade, gradingResults),
        isPublished: true,
        status: 'COMPLETED',
        gradedAt: new Date()
      },
    });

    res.json({
      success: true,
      data: {
        attemptId,
        totalMarks: attempt.exam.totalMarks,
        obtainedMarks: totalScore,
        percentage: percentage.toFixed(2),
        grade,
        passed: totalScore >= attempt.exam.passingMarks,
        aiGradingUsed,
        detailedResults: gradingResults,
        overallFeedback: generateOverallFeedback(percentage, grade, gradingResults),
        message: totalScore >= attempt.exam.passingMarks
          ? '🎉 Congratulations! You passed the exam!'
          : '📚 Keep studying! Review the feedback and try again.'
      },
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit exam',
      error: error.message
    });
  }
};

function generateOverallFeedback(percentage: number, grade: string, results: any[]) {
  const correctCount = results.filter(r => r.status === 'correct').length;
  const partialCount = results.filter(r => r.status === 'partial').length;
  const incorrectCount = results.filter(r => r.status === 'incorrect').length;

  let feedback = `You scored ${percentage.toFixed(1)}% (Grade: ${grade})\n\n`;
  feedback += `Performance Summary:\n`;
  feedback += `✅ Correct: ${correctCount} questions\n`;
  if (partialCount > 0) {
    feedback += `⚠️ Partially Correct: ${partialCount} questions\n`;
  }
  feedback += `❌ Incorrect: ${incorrectCount} questions\n\n`;

  if (percentage >= 90) {
    feedback += "Excellent work! You've demonstrated mastery of the material.";
  } else if (percentage >= 80) {
    feedback += "Great job! You have a strong understanding of the concepts.";
  } else if (percentage >= 70) {
    feedback += "Good effort! Review the incorrect answers to strengthen your knowledge.";
  } else if (percentage >= 60) {
    feedback += "You're making progress. Focus on the topics you found challenging.";
  } else if (percentage >= 50) {
    feedback += "You passed, but there's room for improvement. Study the feedback carefully.";
  } else {
    feedback += "Don't give up! Review the material and practice more. You'll get there!";
  }

  return feedback;
}