'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Trophy,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Star,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentProgress {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  module: {
    id: string;
    title: string;
    totalLessons: number;
  };
  currentLesson: number;
  currentStep: number;
  overallProgress: number;
  totalXp: number;
  lives: number;
  streak: number;
  status: string;
  lastActiveAt: string;
  dueDate?: string;
  startedAt: string;
}

export default function StudyProgressPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<StudentProgress[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    if (session?.user?.role === 'TEACHER' || session?.user?.role === 'PARENT') {
      fetchProgress();
    }
  }, [session]);

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/study-modules/progress');
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);

        // Extract unique modules
        const uniqueModules = data.assignments.reduce((acc: any[], assignment: StudentProgress) => {
          if (!acc.find(m => m.id === assignment.module.id)) {
            acc.push(assignment.module);
          }
          return acc;
        }, []);
        setModules(uniqueModules);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50';
      case 'NOT_STARTED': return 'text-gray-600 bg-gray-50';
      case 'OVERDUE': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const filteredAssignments = selectedModule === 'all'
    ? assignments
    : assignments.filter(a => a.module.id === selectedModule);

  const stats = {
    totalStudents: new Set(assignments.map(a => a.student.id)).size,
    averageProgress: assignments.length > 0
      ? Math.round(assignments.reduce((sum, a) => sum + a.overallProgress, 0) / assignments.length)
      : 0,
    completedCount: assignments.filter(a => a.status === 'COMPLETED').length,
    activeToday: assignments.filter(a => {
      const lastActive = new Date(a.lastActiveAt);
      const today = new Date();
      return lastActive.toDateString() === today.toDateString();
    }).length
  };

  if (session?.user?.role === 'STUDENT') {
    return (
      <div className="text-center py-12">
        <p>This page is for teachers and parents only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Student Progress</h1>
        <p className="text-gray-600">Track how your students are progressing through their study modules</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-3xl font-bold">{stats.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Progress</p>
                <p className="text-3xl font-bold">{stats.averageProgress}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold">{stats.completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Today</p>
                <p className="text-3xl font-bold">{stats.activeToday}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Filter */}
      <Tabs value={selectedModule} onValueChange={setSelectedModule}>
        <TabsList>
          <TabsTrigger value="all">All Modules</TabsTrigger>
          {modules.map(module => (
            <TabsTrigger key={module.id} value={module.id}>
              {module.title}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedModule} className="mt-6">
          {/* Student Progress Table */}
          <Card>
            <CardHeader>
              <CardTitle>Student Progress Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAssignments.length > 0 ? (
                  filteredAssignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{assignment.student.name}</h3>
                          <p className="text-sm text-gray-600">{assignment.student.email}</p>
                        </div>
                        <Badge className={cn(getStatusColor(assignment.status))}>
                          {assignment.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {/* Module Info */}
                        <div className="flex items-center gap-2 text-sm">
                          <BookOpen className="h-4 w-4 text-gray-500" />
                          <span>{assignment.module.title}</span>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Overall Progress</span>
                            <span className="font-semibold">{assignment.overallProgress}%</span>
                          </div>
                          <Progress
                            value={assignment.overallProgress}
                            className={cn("h-2", getProgressColor(assignment.overallProgress))}
                          />
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                          <div>
                            <p className="text-xs text-gray-600">Current Lesson</p>
                            <p className="font-semibold">
                              {assignment.currentLesson} / {assignment.module.totalLessons}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">XP Earned</p>
                            <p className="font-semibold flex items-center gap-1">
                              <Trophy className="h-3 w-3 text-yellow-500" />
                              {assignment.totalXp}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Streak</p>
                            <p className="font-semibold flex items-center gap-1">
                              <Star className="h-3 w-3 text-orange-500" />
                              {assignment.streak} days
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Last Active</p>
                            <p className="font-semibold text-sm">
                              {new Date(assignment.lastActiveAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Due Date Warning */}
                        {assignment.dueDate && new Date(assignment.dueDate) < new Date() && assignment.status !== 'COMPLETED' && (
                          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded p-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>Overdue since {new Date(assignment.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No students assigned to this module yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}