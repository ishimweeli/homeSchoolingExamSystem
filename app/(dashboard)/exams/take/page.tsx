'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, BookOpen, AlertCircle, Play } from 'lucide-react';
import { format } from 'date-fns';

interface AssignedExam {
  id: string;
  exam: {
    id: string;
    title: string;
    description: string | null;
    subject: string;
    gradeLevel: number;
    duration: number | null;
    totalMarks: number;
    questions: any[];
  };
  dueDate: string | null;
  startDate: string | null;
  maxAttempts: number;
  allowLateSubmission: boolean;
  attemptCount?: number;
  lastAttempt?: {
    submittedAt: string;
    score?: number;
  };
}

export default function TakeExamPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [assignedExams, setAssignedExams] = useState<AssignedExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== 'STUDENT') {
      router.push('/dashboard');
      return;
    }
    fetchAssignedExams();
  }, [session, router]);

  const fetchAssignedExams = async () => {
    try {
      const response = await fetch('/api/students/assigned-exams');
      if (response.ok) {
        const data = await response.json();
        setAssignedExams(data);
      }
    } catch (error) {
      console.error('Error fetching assigned exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const canTakeExam = (exam: AssignedExam) => {
    // Check if exam is available based on dates
    const now = new Date();
    
    if (exam.startDate && new Date(exam.startDate) > now) {
      return { canTake: false, reason: 'Not yet available' };
    }
    
    if (exam.dueDate && new Date(exam.dueDate) < now && !exam.allowLateSubmission) {
      return { canTake: false, reason: 'Past due date' };
    }
    
    if (exam.attemptCount && exam.attemptCount >= exam.maxAttempts) {
      return { canTake: false, reason: 'Max attempts reached' };
    }
    
    return { canTake: true, reason: null };
  };

  const startExam = (examId: string) => {
    router.push(`/exams/take/${examId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const availableExams = assignedExams.filter(exam => canTakeExam(exam).canTake);
  const upcomingExams = assignedExams.filter(exam => {
    const status = canTakeExam(exam);
    return !status.canTake && status.reason === 'Not yet available';
  });
  const pastExams = assignedExams.filter(exam => {
    const status = canTakeExam(exam);
    return !status.canTake && (status.reason === 'Past due date' || status.reason === 'Max attempts reached');
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Exams</h1>
        <p className="text-muted-foreground mt-2">View and take your assigned exams</p>
      </div>

      {assignedExams.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Exams Assigned</h3>
              <p className="text-muted-foreground">
                You don't have any exams assigned yet. Check back later or contact your teacher.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Available Exams */}
          {availableExams.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Play className="h-5 w-5 text-green-600" />
                Available Exams
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableExams.map((assignment) => (
                  <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{assignment.exam.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {assignment.exam.subject} • Grade {assignment.exam.gradeLevel}
                          </CardDescription>
                        </div>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Available
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {assignment.exam.description && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {assignment.exam.description}
                        </p>
                      )}
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span>{assignment.exam.questions.length} questions</span>
                        </div>
                        
                        {assignment.exam.duration && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{assignment.exam.duration} minutes</span>
                          </div>
                        )}
                        
                        {assignment.dueDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Due: {format(new Date(assignment.dueDate), 'PPp')}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-sm text-muted-foreground">
                            Attempts: {assignment.attemptCount || 0}/{assignment.maxAttempts}
                          </span>
                          {assignment.lastAttempt?.score !== undefined && (
                            <span className="text-sm font-medium">
                              Last Score: {assignment.lastAttempt.score}%
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full mt-4" 
                        onClick={() => startExam(assignment.exam.id)}
                      >
                        Start Exam
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Exams */}
          {upcomingExams.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Upcoming Exams
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingExams.map((assignment) => (
                  <Card key={assignment.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{assignment.exam.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {assignment.exam.subject} • Grade {assignment.exam.gradeLevel}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Upcoming
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {assignment.startDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Available from: {format(new Date(assignment.startDate), 'PPp')}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past/Completed Exams */}
          {pastExams.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-600" />
                Past/Completed Exams
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastExams.map((assignment) => {
                  const status = canTakeExam(assignment);
                  return (
                    <Card key={assignment.id} className="opacity-50">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{assignment.exam.title}</CardTitle>
                            <CardDescription className="mt-1">
                              {assignment.exam.subject} • Grade {assignment.exam.gradeLevel}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">
                            {status.reason}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {assignment.lastAttempt?.score !== undefined && (
                          <div className="text-sm">
                            <span className="font-medium">Final Score: {assignment.lastAttempt.score}%</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}