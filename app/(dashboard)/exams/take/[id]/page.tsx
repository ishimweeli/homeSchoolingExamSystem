'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertCircle,
  BookOpen,
  Trophy,
  Timer,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  marks: number;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  duration: number | null;
  questions: Question[];
  totalMarks: number;
}

interface Answer {
  questionId: string;
  answer: string | string[];
}

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const examId = params.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.role !== 'STUDENT') {
      router.push('/dashboard');
      return;
    }
    fetchExam();
  }, [examId, session, router]);

  useEffect(() => {
    if (exam?.duration && timeRemaining !== null) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [exam, timeRemaining]);

  const fetchExam = async () => {
    try {
      const response = await fetch(`/api/exams/${examId}`);
      if (response.ok) {
        const examData = await response.json();
        setExam(examData);
        
        // Start exam attempt
        const attemptResponse = await fetch(`/api/exams/${examId}/attempt`, {
          method: 'POST'
        });
        
        if (attemptResponse.ok) {
          const attemptData = await attemptResponse.json();
          setAttemptId(attemptData.id);
          
          // Set timer if exam has duration
          if (examData.duration) {
            setTimeRemaining(examData.duration * 60); // Convert to seconds
          }
        }
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          answers: Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer
          }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/results/${result.attemptId}`);
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    const answeredCount = Object.keys(answers).length;
    return (answeredCount / (exam?.questions.length || 1)) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Exam not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === exam.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Exam Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="outline" className="font-normal">
                      {exam.subject}
                    </Badge>
                    <span className="text-sm text-gray-500">Grade {(exam as any).gradeLevel}</span>
                    {exam.description && (
                      <span className="text-sm text-gray-500">• {exam.description}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Timer Section */}
              {timeRemaining !== null && (
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${
                  timeRemaining < 300 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <Timer className={`h-5 w-5 ${
                    timeRemaining < 300 ? 'text-red-600' : 'text-green-600'
                  }`} />
                  <div>
                    <p className="text-xs text-gray-600">Time Remaining</p>
                    <p className={`text-lg font-bold ${
                      timeRemaining < 300 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatTime(timeRemaining)}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Exam Progress</span>
                <span className="text-sm font-medium text-gray-900">
                  {Object.keys(answers).length} of {exam.questions.length} answered
                </span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {Math.round(getProgressPercentage())}% Complete
                </span>
                <span className="text-xs text-gray-500">
                  {exam.questions.length - Object.keys(answers).length} questions remaining
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Question Navigator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {exam.questions.map((q, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`
                        relative h-10 w-10 rounded-lg font-medium text-sm transition-all
                        ${index === currentQuestionIndex
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-110'
                          : answers[exam.questions[index].id]
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                      `}
                    >
                      {index + 1}
                      {answers[exam.questions[index].id] && index !== currentQuestionIndex && (
                        <CheckCircle2 className="absolute -top-1 -right-1 h-3 w-3 text-green-600" />
                      )}
                    </button>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="mt-6 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-gradient-to-br from-blue-500 to-purple-600"></div>
                    <span className="text-gray-600">Current Question</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-green-100 border border-green-300"></div>
                    <span className="text-gray-600">Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-gray-100 border border-gray-300"></div>
                    <span className="text-gray-600">Not Answered</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Question {currentQuestionIndex + 1}
                      </span>
                    </div>
                    <Badge variant="secondary" className="font-normal">
                      {currentQuestion.type.replace('_', ' ').toLowerCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold text-gray-700">
                      {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Question Text */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                    <p className="text-lg font-medium text-gray-800 leading-relaxed">
                      {currentQuestion.question}
                    </p>
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-4">
                    {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                      <RadioGroup
                        value={answers[currentQuestion.id] || ''}
                        onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                      >
                        <div className="space-y-3">
                          {currentQuestion.options.map((option, index) => {
                            const isSelected = answers[currentQuestion.id] === option;
                            return (
                              <div
                                key={index}
                                className={`
                                  relative flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer
                                  ${isSelected 
                                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }
                                `}
                              >
                                <RadioGroupItem value={option} id={`option-${index}`} className="text-blue-600" />
                                <Label 
                                  htmlFor={`option-${index}`} 
                                  className="cursor-pointer flex-1 text-gray-700 font-medium"
                                >
                                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-xs font-bold mr-3">
                                    {String.fromCharCode(65 + index)}
                                  </span>
                                  {option}
                                </Label>
                                {isSelected && (
                                  <CheckCircle2 className="absolute right-4 h-5 w-5 text-blue-600" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </RadioGroup>
                    )}

                    {currentQuestion.type === 'TRUE_FALSE' && (
                      <RadioGroup
                        value={answers[currentQuestion.id] || ''}
                        onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                      >
                        <div className="grid grid-cols-2 gap-4">
                          {['true', 'false'].map((value) => {
                            const isSelected = answers[currentQuestion.id] === value;
                            return (
                              <div
                                key={value}
                                className={`
                                  relative flex items-center space-x-3 p-6 rounded-xl border-2 transition-all cursor-pointer
                                  ${isSelected 
                                    ? value === 'true' 
                                      ? 'border-green-500 bg-green-50 shadow-md' 
                                      : 'border-red-500 bg-red-50 shadow-md'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }
                                `}
                              >
                                <RadioGroupItem value={value} id={value} />
                                <Label 
                                  htmlFor={value} 
                                  className="cursor-pointer flex-1 text-center text-lg font-semibold capitalize"
                                >
                                  {value === 'true' ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                      True
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-2">
                                      <Circle className="h-5 w-5 text-red-600" />
                                      False
                                    </div>
                                  )}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </RadioGroup>
                    )}

                    {currentQuestion.type === 'SHORT_ANSWER' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Your Answer:</Label>
                        <Input
                          value={answers[currentQuestion.id] || ''}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full text-lg p-4 border-2 focus:border-blue-500"
                        />
                      </div>
                    )}

                    {(currentQuestion.type === 'LONG_ANSWER' || currentQuestion.type === 'ESSAY') && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Your Answer:</Label>
                        <Textarea
                          value={answers[currentQuestion.id] || ''}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          placeholder="Write your detailed answer here..."
                          className="w-full min-h-[250px] text-base p-4 border-2 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500">
                          {answers[currentQuestion.id]?.length || 0} characters
                        </p>
                      </div>
                    )}

                    {currentQuestion.type === 'FILL_BLANKS' && (() => {
                      // Parse the question to find blanks (marked with _____ or parentheses)
                      const questionText = currentQuestion.question;
                      const blankPattern = /(_+|\([^)]*\))/g;
                      const questionParts = questionText.split(blankPattern);
                      const blanks = questionText.match(blankPattern) || [];
                      const blankCount = blanks.length;
                      
                      // Get or initialize answers array
                      let currentAnswers = [];
                      try {
                        if (answers[currentQuestion.id]) {
                          currentAnswers = typeof answers[currentQuestion.id] === 'string' ? 
                            JSON.parse(answers[currentQuestion.id]) : answers[currentQuestion.id];
                        }
                      } catch (e) {
                        currentAnswers = [];
                      }
                      if (!Array.isArray(currentAnswers)) {
                        currentAnswers = [];
                      }
                      while (currentAnswers.length < blankCount) {
                        currentAnswers.push('');
                      }
                      
                      let blankIndex = 0;
                      
                      return (
                        <div className="space-y-4">
                          <Label className="text-sm font-medium text-gray-700">Fill in the blanks:</Label>
                          <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                            <div className="text-lg leading-relaxed flex flex-wrap items-baseline gap-1">
                              {questionParts.map((part, index) => {
                                if (part.match(blankPattern)) {
                                  const currentBlankIndex = blankIndex++;
                                  return (
                                    <Input
                                      key={`blank-${currentBlankIndex}`}
                                      type="text"
                                      value={currentAnswers[currentBlankIndex] || ''}
                                      onChange={(e) => {
                                        const newAnswers = [...currentAnswers];
                                        newAnswers[currentBlankIndex] = e.target.value;
                                        handleAnswerChange(currentQuestion.id, JSON.stringify(newAnswers));
                                      }}
                                      placeholder="type answer"
                                      className="inline-flex mx-1 px-3 py-1 border-2 border-blue-300 rounded-md focus:border-blue-500 text-center font-medium bg-white"
                                      style={{ width: '150px', verticalAlign: 'baseline' }}
                                    />
                                  );
                                }
                                return <span key={`text-${index}`}>{part}</span>;
                              })}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Enter your answers in the blanks above ({blankCount} blank{blankCount !== 1 ? 's' : ''} to fill)
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    disabled={isFirstQuestion}
                    className="min-w-[120px]"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {currentQuestionIndex + 1} of {exam.questions.length}
                    </span>
                  </div>

                  {isLastQuestion ? (
                    <Button 
                      size="lg"
                      onClick={() => setShowSubmitDialog(true)} 
                      disabled={submitting}
                      className="min-w-[140px] bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit Exam
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      className="min-w-[120px] bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                <Send className="h-5 w-5 text-white" />
              </div>
              Ready to Submit?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 mt-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Exam Progress</span>
                    <span className="text-sm font-bold text-gray-900">
                      {Math.round((Object.keys(answers).length / exam.questions.length) * 100)}%
                    </span>
                  </div>
                  <Progress value={(Object.keys(answers).length / exam.questions.length) * 100} className="h-2" />
                  <div className="flex justify-between mt-3 text-xs">
                    <span className="text-gray-600">
                      {Object.keys(answers).length} answered
                    </span>
                    <span className="text-gray-600">
                      {exam.questions.length - Object.keys(answers).length} remaining
                    </span>
                  </div>
                </div>

                {Object.keys(answers).length < exam.questions.length && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-yellow-900 text-sm">
                          Incomplete Submission
                        </p>
                        <p className="text-yellow-700 text-xs mt-1">
                          You have {exam.questions.length - Object.keys(answers).length} unanswered questions. 
                          These will be marked as incorrect.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {Object.keys(answers).length === exam.questions.length && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-green-900 text-sm">
                          All Questions Answered
                        </p>
                        <p className="text-green-700 text-xs mt-1">
                          Great job! You've answered all questions.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600 text-center">
                  Once submitted, you cannot change your answers.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="min-w-[120px]">
              Review Answers
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmit} 
              disabled={submitting}
              className="min-w-[120px] bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Submitting...
                </div>
              ) : (
                'Submit Exam'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}