'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Save,
  ArrowLeft,
  Award,
  FileText
} from 'lucide-react';

interface Question {
  id: string;
  question: string;
  type: 'multipleChoice' | 'trueFalse' | 'shortAnswer' | 'longAnswer' | 'fillBlanks';
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  explanation?: string;
}

interface Answer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  points?: number;
}

interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  questions: Question[];
  answers: Answer[];
  totalScore?: number;
  maxScore: number;
  status: 'pending' | 'graded' | 'reviewing';
  feedback?: string;
  submittedAt: string;
}

export default function GradeExamPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [grades, setGrades] = useState<Record<string, { points: number; feedback?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchExamResult(params.id as string);
    }
  }, [params.id]);

  const fetchExamResult = async (resultId: string) => {
    try {
      const response = await fetch(`/api/results/${resultId}/grade`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched result data:', data);
        setResult(data);
        
        // Initialize grades for manual grading questions
        const initialGrades: Record<string, { points: number; feedback?: string }> = {};
        if (data.questions && Array.isArray(data.questions)) {
          data.questions.forEach((q: Question) => {
            const answer = data.answers?.find((a: Answer) => a.questionId === q.id);
            if (answer && answer.points !== undefined) {
              initialGrades[q.id] = { points: answer.points };
            } else if (q.type === 'shortAnswer' || q.type === 'longAnswer' || q.type === 'fillBlanks') {
              initialGrades[q.id] = { points: 0 };
            }
          });
        }
        setGrades(initialGrades);
      } else {
        const error = await response.text();
        console.error('API error:', error);
        toast.error('Failed to load exam result');
      }
    } catch (error) {
      console.error('Error fetching result:', error);
      toast.error('Failed to load exam result');
    } finally {
      setLoading(false);
    }
  };

  const evaluateAnswer = (question: Question, studentAnswer: string | string[]): boolean => {
    if (!question.correctAnswer) return false;

    switch (question.type) {
      case 'multipleChoice':
      case 'trueFalse':
        return studentAnswer === question.correctAnswer;
      
      case 'fillBlanks':
        // For fill in the blanks, check if answer matches (case-insensitive)
        if (typeof studentAnswer === 'string' && typeof question.correctAnswer === 'string') {
          return studentAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
        }
        // If multiple blanks
        if (Array.isArray(studentAnswer) && Array.isArray(question.correctAnswer)) {
          return studentAnswer.every((ans, idx) => 
            ans.toLowerCase().trim() === question.correctAnswer[idx]?.toLowerCase().trim()
          );
        }
        return false;
      
      default:
        return false;
    }
  };

  const handleGradeChange = (questionId: string, points: number, feedback?: string) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: { points, feedback }
    }));
  };

  const calculateTotalScore = () => {
    let total = 0;
    
    if (result?.questions && Array.isArray(result.questions)) {
      result.questions.forEach(question => {
        const answer = result.answers?.find(a => a.questionId === question.id);
        
        if (question.type === 'multipleChoice' || question.type === 'trueFalse' || question.type === 'fillBlanks') {
          // Auto-grade these types
          if (answer && evaluateAnswer(question, answer.answer)) {
            total += question.points;
          }
        } else {
          // Use manual grade for other types
          total += grades[question.id]?.points || 0;
        }
      });
    }
    
    return total;
  };

  const handleSaveGrades = async () => {
    if (!result) return;
    
    setSaving(true);
    try {
      const totalScore = calculateTotalScore();
      
      const response = await fetch(`/api/results/${result.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grades,
          totalScore,
          status: 'graded'
        })
      });

      if (response.ok) {
        toast.success('Grades saved successfully');
        router.push(`/results/${result.id}`);
      } else {
        toast.error('Failed to save grades');
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const renderQuestion = (question: Question, index: number) => {
    const answer = result?.answers.find(a => a.questionId === question.id);
    const isAutoGraded = ['multipleChoice', 'trueFalse', 'fillBlanks'].includes(question.type);
    const isCorrect = answer && isAutoGraded ? evaluateAnswer(question, answer.answer) : null;

    return (
      <Card key={question.id} className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Question {index + 1}
                <Badge variant="outline">{question.type}</Badge>
                <Badge>{question.points} marks</Badge>
              </CardTitle>
              <p className="mt-2 font-normal">{question.question}</p>
            </div>
            {isCorrect !== null && (
              <div className="ml-4">
                {isCorrect ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show options for multiple choice */}
          {question.type === 'multipleChoice' && question.options && (
            <div className="space-y-2">
              <Label>Options:</Label>
              <RadioGroup value={answer?.answer as string} disabled>
                {question.options.map((option, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${question.id}-${idx}`} />
                    <Label 
                      htmlFor={`${question.id}-${idx}`}
                      className={cn(
                        option === question.correctAnswer && "text-green-600 font-semibold",
                        option === answer?.answer && option !== question.correctAnswer && "text-red-600"
                      )}
                    >
                      {option}
                      {option === question.correctAnswer && " ✓"}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Show student's answer */}
          <div>
            <Label>Student's Answer:</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md">
              {answer ? (
                <span className={cn(
                  isCorrect === true && "text-green-600",
                  isCorrect === false && "text-red-600"
                )}>
                  {Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer}
                </span>
              ) : (
                <span className="text-gray-500 italic">No answer provided</span>
              )}
            </div>
          </div>

          {/* Show correct answer for auto-graded questions */}
          {isAutoGraded && question.correctAnswer && !isCorrect && (
            <div>
              <Label>Correct Answer:</Label>
              <div className="mt-1 p-3 bg-green-50 rounded-md text-green-700">
                {typeof question.correctAnswer === 'object' && question.correctAnswer !== null ?
                    JSON.stringify(question.correctAnswer) :
                    Array.isArray(question.correctAnswer) ? 
                      question.correctAnswer.join(', ') : 
                      question.correctAnswer}
              </div>
            </div>
          )}

          {/* Manual grading for essay/short answer */}
          {!isAutoGraded && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Points Awarded:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={question.points}
                    value={grades[question.id]?.points || 0}
                    onChange={(e) => handleGradeChange(
                      question.id, 
                      Math.min(Number(e.target.value), question.points)
                    )}
                    className="w-20"
                  />
                  <span>/ {question.points}</span>
                </div>
              </div>
              
              <div>
                <Label>Feedback (optional):</Label>
                <Textarea
                  value={grades[question.id]?.feedback || ''}
                  onChange={(e) => handleGradeChange(
                    question.id,
                    grades[question.id]?.points || 0,
                    e.target.value
                  )}
                  placeholder="Add feedback for this answer..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Show explanation if available */}
          {question.explanation && (
            <div className="mt-2 p-3 bg-blue-50 rounded-md">
              <Label className="text-blue-700">Explanation:</Label>
              <p className="text-sm text-blue-600 mt-1">{question.explanation}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p>Exam result not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalScore = calculateTotalScore();
  const percentage = Math.round((totalScore / result.maxScore) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Grade Exam</h1>
          <p className="text-gray-600 mt-1">Review and grade student answers</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Student Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {result.examTitle}
          </CardTitle>
          <CardDescription>
            Student: {result.studentName} • Submitted: {new Date(result.submittedAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <Award className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Current Score</p>
                <p className="text-2xl font-bold">{totalScore} / {result.maxScore}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Percentage</p>
              <p className="text-2xl font-bold">{percentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Questions & Answers</h2>
        {result.questions && Array.isArray(result.questions) ? (
          result.questions.map((question, index) => renderQuestion(question, index))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p>No questions found in this exam</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4 sticky bottom-4">
        <Button
          size="lg"
          onClick={handleSaveGrades}
          disabled={saving}
        >
          {saving ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Grades
            </>
          )}
        </Button>
      </div>
    </div>
  );
}