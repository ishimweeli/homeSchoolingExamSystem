'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Plus,
  Trophy,
  Clock,
  Zap,
  Play,
  Lock,
  CheckCircle,
  Loader2,
  GraduationCap,
  Star,
  Heart
} from 'lucide-react';
import Link from 'next/link';

interface StudyModule {
  id: string;
  title: string;
  description: string;
  topic: string;
  subject: string;
  gradeLevel: number;
  totalLessons: number;
  xpReward: number;
  progress?: {
    currentLessonNumber: number;
    currentStepNumber: number;
    totalXP: number;
    completedSteps: any[];
  };
  assignment?: {
    dueDate: string;
    isCompleted: boolean;
  };
}

export default function StudyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [modules, setModules] = useState<StudyModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalXP: 0,
    streak: 0,
    completedModules: 0,
    badges: 0
  });

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/study-modules');
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || []);
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (module: StudyModule) => {
    if (!module.progress) return 0;
    // Use the overallProgress if available
    if ((module.progress as any).overallProgress !== undefined) {
      return (module.progress as any).overallProgress;
    }
    // Otherwise calculate based on current lesson/step
    const currentLesson = module.progress.currentLessonNumber || 1;
    const currentStep = module.progress.currentStepNumber || 1;
    const totalLessons = module.totalLessons || 5;
    const stepsPerLesson = 5;
    const totalSteps = totalLessons * stepsPerLesson;
    const completedSteps = ((currentLesson - 1) * stepsPerLesson) + (currentStep - 1);
    return Math.round((completedSteps / totalSteps) * 100);
  };

  const isTeacherOrParent = session?.user?.role === 'TEACHER' || session?.user?.role === 'PARENT';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Interactive Study Modules</h1>
            <p className="text-purple-100">
              {isTeacherOrParent 
                ? 'Create AI-powered learning experiences for your students'
                : 'Learn at your own pace with interactive lessons'}
            </p>
          </div>
          
          {isTeacherOrParent && (
            <Link href="/study/create">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                <Plus className="h-5 w-5 mr-2" />
                Create Module
              </Button>
            </Link>
          )}
        </div>

        {/* Student Stats */}
        {!isTeacherOrParent && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalXP}</p>
                  <p className="text-xs text-purple-100">Total XP</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <div>
                  <p className="text-2xl font-bold">{stats.streak}</p>
                  <p className="text-xs text-purple-100">Day Streak</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="text-2xl font-bold">{stats.completedModules}</p>
                  <p className="text-xs text-purple-100">Completed</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                <div>
                  <p className="text-2xl font-bold">{stats.badges}</p>
                  <p className="text-xs text-purple-100">Badges</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.length > 0 ? (
          modules.map((module) => {
            const progress = calculateProgress(module);
            const isLocked = false; // TODO: Implement prerequisites
            
            return (
              <Card key={module.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {module.description || `${module.topic} • Grade ${module.gradeLevel}`}
                      </CardDescription>
                    </div>
                    {isLocked && (
                      <Lock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="secondary">{module.subject}</Badge>
                    <Badge variant="outline">Grade {module.gradeLevel}</Badge>
                    <Badge className="bg-purple-100 text-purple-700">
                      {module.totalLessons} Lessons
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {/* Assignment Stats for Teachers */}
                  {isTeacherOrParent && (module as any).assignments && (module as any).assignments.length > 0 && (
                    <div className="space-y-2 mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-700 font-medium">
                          {(module as any).assignments.length} Students Assigned
                        </span>
                        <span className="text-blue-600">
                          Avg Progress: {Math.round(
                            (module as any).assignments.reduce((sum: number, a: any) =>
                              sum + (a.overallProgress || 0), 0) / (module as any).assignments.length
                          )}%
                        </span>
                      </div>
                      <Progress
                        value={(module as any).assignments.reduce((sum: number, a: any) =>
                          sum + (a.overallProgress || 0), 0) / (module as any).assignments.length}
                        className="h-2 bg-blue-100"
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(module as any).assignments.slice(0, 3).map((assignment: any) => (
                          <Badge key={assignment.id} variant="outline" className="text-xs">
                            {assignment.student?.name}: {assignment.overallProgress || 0}%
                          </Badge>
                        ))}
                        {(module as any).assignments.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(module as any).assignments.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progress for Students */}
                  {!isTeacherOrParent && module.progress && (
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Lesson {module.progress.currentLessonNumber} of {module.totalLessons}
                        </span>
                        <span className="font-semibold text-purple-600">
                          {module.progress.totalXP} XP
                        </span>
                      </div>

                      {module.assignment?.dueDate && (
                        <div className="flex items-center gap-2 text-sm text-orange-600">
                          <Clock className="h-4 w-4" />
                          <span>Due {new Date(module.assignment.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* XP Reward */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span>{module.xpReward} XP Total</span>
                    </div>
                    {!isTeacherOrParent && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>3 Lives</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isLocked ? (
                    <Button className="w-full" disabled>
                      <Lock className="h-4 w-4 mr-2" />
                      Complete Prerequisites
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      {!isTeacherOrParent ? (
                        <Link href={`/study/modules/${module.id}`} className="flex-1">
                          <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                            {module.progress ? (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Continue
                              </>
                            ) : (
                              <>
                                <BookOpen className="h-4 w-4 mr-2" />
                                Start Learning
                              </>
                            )}
                          </Button>
                        </Link>
                      ) : (
                        <>
                          <Link href={`/study/modules/${module.id}/preview`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              Preview
                            </Button>
                          </Link>
                          <Link href={`/study/modules/${module.id}/assign`} className="flex-1">
                            <Button className="w-full">
                              Assign
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isTeacherOrParent ? 'No Study Modules Yet' : 'No Modules Assigned'}
            </h3>
            <p className="text-gray-600 mb-4">
              {isTeacherOrParent 
                ? 'Create your first AI-powered study module to get started'
                : 'Ask your teacher or parent to assign you some modules'}
            </p>
            {isTeacherOrParent && (
              <Link href="/study/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Module
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}