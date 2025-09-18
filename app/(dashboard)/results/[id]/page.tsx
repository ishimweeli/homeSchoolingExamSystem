'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  Award, 
  FileText,
  ArrowLeft,
  Download,
  Share2,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';

interface DetailedResult {
  id: string;
  attemptId: string;
  exam: {
    id: string;
    title: string;
    description: string | null;
    subject: string;
    gradeLevel: number;
    totalMarks: number;
    duration: number | null;
    questions: Array<{
      id: string;
      question: string;
      type: string;
      marks: number;
      correctAnswer: any;
      options?: string[];
    }>;
  };
  student: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    email: string | null;
  };
  attempt: {
    startedAt: string;
    submittedAt: string | null;
    timeSpent: number | null;
  };
  answers: Array<{
    id: string;
    questionId: string;
    answer: any;
    aiScore: number | null;
    aiFeedback: string | null;
    manualScore: number | null;
    manualFeedback: string | null;
    finalScore: number | null;
  }>;
  totalScore: number;
  percentage: number;
  grade: string | null;
  status: string;
  overallFeedback: string | null;
  aiAnalysis: any;
}

export default function DetailedResultPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const attemptId = params.id as string;

  const [result, setResult] = useState<DetailedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDetailedResult();
  }, [attemptId]);

  const fetchDetailedResult = async () => {
    try {
      const response = await fetch(`/api/results/${attemptId}`);
      if (response.ok) {
        const data = await response.json();
        // Check if results are pending review
        if (data.status === 'pending_review') {
          setResult(null);
        } else {
          setResult(data);
        }
      }
    } catch (error) {
      console.error('Error fetching detailed result:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string | null) => {
    switch(grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getAnswerStatus = (questionId: string) => {
    const answer = result?.answers.find(a => a.questionId === questionId);
    const question = result?.exam.questions.find(q => q.id === questionId);
    
    if (!answer || !question) return 'unanswered';
    
    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
      return answer.answer === question.correctAnswer ? 'correct' : 'incorrect';
    }
    
    // For other types, check if scored
    if (answer.finalScore !== null) {
      const percentage = (answer.finalScore / question.marks) * 100;
      return percentage >= 70 ? 'correct' : percentage >= 40 ? 'partial' : 'incorrect';
    }
    
    return 'pending';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // TODO: Implement PDF download
    console.log('Downloading result as PDF...');
  };

  const handleShare = () => {
    // TODO: Implement sharing functionality
    console.log('Sharing result...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto bg-yellow-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle>Results Pending Review</CardTitle>
            <CardDescription className="mt-2 text-base">
              Your exam has been submitted successfully!
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                Your teacher needs to review and publish the results before they become available. 
                This usually takes 1-2 days. You'll be notified once your results are ready.
              </p>
            </div>
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">
                Exam submitted at: {new Date().toLocaleString()}
              </p>
              <Button onClick={() => router.push('/dashboard')} className="mt-4">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStudentDisplayName = () => {
    const student = result.student;
    if (student.firstName || student.lastName) {
      return `${student.firstName || ''} ${student.lastName || ''}`.trim();
    }
    return student.name || student.username || student.email || 'Unknown';
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/results')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Results
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{result.exam.title}</h1>
            <p className="text-muted-foreground mt-2">
              {result.exam.subject} • Grade {result.exam.gradeLevel}
            </p>
            {session?.user?.role !== 'STUDENT' && (
              <p className="text-sm mt-1">
                Student: {getStudentDisplayName()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {session?.user?.role !== 'STUDENT' && result.status !== 'graded' && (
              <Button 
                onClick={() => router.push(`/results/${result.id}/grade`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Grade Exam
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Score Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Score</span>
                <span className={`text-2xl font-bold ${getScoreColor(result.percentage)}`}>
                  {result.totalScore}/{result.exam.totalMarks}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Percentage</span>
                <span className={`text-2xl font-bold ${getScoreColor(result.percentage)}`}>
                  {result.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Grade</span>
                {result.grade && (
                  <Badge className={`text-lg px-4 py-1 ${getGradeColor(result.grade)}`}>
                    {result.grade}
                  </Badge>
                )}
              </div>
              <Progress value={result.percentage} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Submitted: {result.attempt.submittedAt 
                    ? format(new Date(result.attempt.submittedAt), 'PPp')
                    : 'Not submitted'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Time Spent: {result.attempt.timeSpent || 0} minutes
                  {result.exam.duration && ` / ${result.exam.duration} minutes`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Questions: {result.exam.questions.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Status: <Badge variant="outline">{result.status}</Badge>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Questions Passed</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {result.answers.filter(a => {
                const question = result.exam.questions.find(q => q.id === a.questionId);
                if (!question) return false;
                const percentage = ((a.finalScore || 0) / question.marks) * 100;
                return percentage >= 70;
              }).length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              out of {result.exam.questions.length} questions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Questions Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {result.answers.filter(a => {
                const question = result.exam.questions.find(q => q.id === a.questionId);
                if (!question) return false;
                const percentage = ((a.finalScore || 0) / question.marks) * 100;
                return percentage < 40;
              }).length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              need improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Partial Credit</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {result.answers.filter(a => {
                const question = result.exam.questions.find(q => q.id === a.questionId);
                if (!question) return false;
                const percentage = ((a.finalScore || 0) / question.marks) * 100;
                return percentage >= 40 && percentage < 70;
              }).length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              partially correct
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Feedback */}
      {result.overallFeedback && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>AI Analysis & Feedback</CardTitle>
            <CardDescription>
              Personalized feedback based on your exam performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">{result.overallFeedback}</p>
            </div>
            {result.aiAnalysis?.generatedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Analysis generated: {format(new Date(result.aiAnalysis.generatedAt), 'PPp')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Question-wise Results */}
      <Card>
        <CardHeader>
          <CardTitle>Question-wise Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {result.exam.questions.map((question, index) => {
              const answer = result.answers.find(a => a.questionId === question.id);
              const status = getAnswerStatus(question.id);
              
              return (
                <div key={question.id} className="border-b last:border-0 pb-6 last:pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium mb-2">{question.question}</p>
                        <p className="text-sm text-muted-foreground">
                          Type: {question.type.replace('_', ' ')} • Marks: {question.marks}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === 'correct' && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Correct
                        </Badge>
                      )}
                      {status === 'incorrect' && (
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Incorrect
                        </Badge>
                      )}
                      {status === 'partial' && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Partial
                        </Badge>
                      )}
                      {status === 'pending' && (
                        <Badge variant="outline">
                          Pending Review
                        </Badge>
                      )}
                      {status === 'unanswered' && (
                        <Badge variant="outline">
                          Not Answered
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Show answer details */}
                  <div className="ml-11 space-y-3">
                    {answer && (
                      <div>
                        <p className="text-sm font-medium mb-1">Your Answer:</p>
                        <p className="text-sm bg-gray-50 p-2 rounded">
                          {typeof answer.answer === 'string' 
                            ? answer.answer 
                            : JSON.stringify(answer.answer)}
                        </p>
                      </div>
                    )}
                    
                    {(question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') && (
                      <div>
                        <p className="text-sm font-medium mb-1">Correct Answer:</p>
                        <p className="text-sm bg-green-50 p-2 rounded text-green-800">
                          {question.correctAnswer}
                        </p>
                      </div>
                    )}
                    
                    {answer?.aiFeedback && (
                      <div>
                        <p className="text-sm font-medium mb-1">AI Feedback:</p>
                        <div className="bg-gray-50 border-l-4 border-blue-400 p-3 rounded">
                          <p className="text-sm text-gray-700">{answer.aiFeedback}</p>
                        </div>
                      </div>
                    )}

                    {answer?.manualFeedback && (
                      <div>
                        <p className="text-sm font-medium mb-1">Teacher Feedback:</p>
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                          <p className="text-sm text-yellow-800">{answer.manualFeedback}</p>
                        </div>
                      </div>
                    )}
                    
                    {answer && (
                      <div className="flex items-center gap-4 text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium">
                          Score: {answer.finalScore || 0}/{question.marks}
                        </span>
                        {answer.aiScore !== null && answer.manualScore !== null && (
                          <span className="text-muted-foreground">
                            (AI: {answer.aiScore}, Manual: {answer.manualScore})
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          ({(((answer.finalScore || 0) / question.marks) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}