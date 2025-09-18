'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Eye,
  Users,
  ArrowLeft,
  Clock,
  Trophy,
  Zap,
  CheckCircle,
  PlayCircle,
  Loader2,
  Brain,
  Target,
  Star,
  Award,
  GraduationCap
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
  difficulty: string;
  passingScore: number;
  maxLives: number;
  createdAt: string;
  lessons: StudyLesson[];
  assignments: StudentAssignment[];
  creator: {
    name: string;
    email: string;
  };
}

interface StudyLesson {
  id: string;
  lessonNumber: number;
  title: string;
  content: any;
  steps: LessonStep[];
}

interface LessonStep {
  id: string;
  stepNumber: number;
  type: string;
  title: string;
  content: any;
  passingScore: number;
}

interface StudentAssignment {
  id: string;
  student: {
    name: string;
    email: string;
  };
  status: string;
  overallProgress: number;
  totalXp: number;
}

export default function StudyModulePreviewPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [module, setModule] = useState<StudyModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(0);

  useEffect(() => {
    fetchModule();
  }, [params.id]);

  const fetchModule = async () => {
    try {
      const response = await fetch(`/api/study-modules/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setModule(data.module);
      } else {
        console.error('Failed to fetch module');
      }
    } catch (error) {
      console.error('Error fetching module:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'THEORY': return <BookOpen className="h-4 w-4" />;
      case 'PRACTICE_EASY': return <Target className="h-4 w-4 text-green-600" />;
      case 'PRACTICE_MEDIUM': return <Zap className="h-4 w-4 text-yellow-600" />;
      case 'PRACTICE_HARD': return <Brain className="h-4 w-4 text-red-600" />;
      case 'QUIZ': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <PlayCircle className="h-4 w-4" />;
    }
  };

  const getStepTypeName = (type: string) => {
    switch (type) {
      case 'THEORY': return 'Theory & Explanation';
      case 'PRACTICE_EASY': return 'Easy Practice';
      case 'PRACTICE_MEDIUM': return 'Medium Practice';
      case 'PRACTICE_HARD': return 'Hard Practice';
      case 'QUIZ': return 'Quiz';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-12">
        <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Module Not Found</h3>
        <p className="text-gray-600 mb-4">The study module you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/study">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Study Modules
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/study" className="hover:text-purple-600 transition-colors">
              Study Modules
            </Link>
            <span>/</span>
            <span>Preview</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{module.title}</h1>
          <p className="text-gray-600 mb-4">{module.description}</p>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{module.subject}</Badge>
            <Badge variant="outline">Grade {module.gradeLevel}</Badge>
            <Badge className={getDifficultyColor(module.difficulty)}>
              {module.difficulty}
            </Badge>
            <Badge className="bg-purple-100 text-purple-700">
              {module.totalLessons} Lessons
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/study/modules/${module.id}/assign`}>
            <Button>
              <Users className="h-4 w-4 mr-2" />
              Assign to Students
            </Button>
          </Link>
          <Link href="/study">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Study
            </Button>
          </Link>
        </div>
      </div>

      {/* Module Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{module.totalLessons}</p>
                <p className="text-sm text-gray-600">Lessons</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{module.xpReward}</p>
                <p className="text-sm text-gray-600">Total XP</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{module.passingScore}%</p>
                <p className="text-sm text-gray-600">Passing Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <Award className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{module.maxLives}</p>
                <p className="text-sm text-gray-600">Lives</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="lessons" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lessons">Lessons & Content</TabsTrigger>
          <TabsTrigger value="assignments">Student Assignments ({module.assignments?.length || 0})</TabsTrigger>
          <TabsTrigger value="settings">Module Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="lessons" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lessons List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Lessons Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {module.lessons?.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedLesson === index 
                        ? 'bg-purple-100 border border-purple-200' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedLesson(index)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-purple-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-medium">
                        {lesson.lessonNumber}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{lesson.title}</p>
                        <p className="text-xs text-gray-600">
                          {lesson.steps?.length || 0} steps
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            {/* Lesson Content */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">
                  {module.lessons?.[selectedLesson] ? (
                    <>Lesson {module.lessons[selectedLesson].lessonNumber}: {module.lessons[selectedLesson].title}</>
                  ) : (
                    'Select a lesson to preview'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {module.lessons?.[selectedLesson] ? (
                  <div className="space-y-4">
                    {/* Lesson Objective */}
                    {module.lessons[selectedLesson].content?.objective && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Learning Objective</h4>
                        <p className="text-blue-800 text-sm">{module.lessons[selectedLesson].content.objective}</p>
                      </div>
                    )}
                    
                    {/* Lesson Steps */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Lesson Steps</h4>
                      {module.lessons[selectedLesson].steps?.map((step, stepIndex) => (
                        <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-3">
                            {getStepTypeIcon(step.type)}
                            <div className="flex-1">
                              <h5 className="font-medium">Step {step.stepNumber}: {step.title}</h5>
                              <p className="text-sm text-gray-600">{getStepTypeName(step.type)}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {step.passingScore}% to pass
                            </Badge>
                          </div>
                          
                          {/* Step Content Preview */}
                          {step.content?.explanation && (
                            <div className="bg-gray-50 p-3 rounded text-sm">
                              <p className="font-medium mb-1">Explanation:</p>
                              <p>{step.content.explanation}</p>
                            </div>
                          )}
                          
                          {step.content?.questions && step.content.questions.length > 0 && (
                            <div className="bg-purple-50 p-3 rounded text-sm mt-2">
                              <p className="font-medium mb-1">Practice Questions:</p>
                              <p>{step.content.questions.length} interactive questions</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Preview Lesson Content</h3>
                    <p className="text-gray-600">Select a lesson from the list to preview its content and structure.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="assignments" className="space-y-6">
          {module.assignments && module.assignments.length > 0 ? (
            <div className="grid gap-4">
              {module.assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <GraduationCap className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{assignment.student.name}</h3>
                          <p className="text-sm text-gray-600">{assignment.student.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{assignment.overallProgress}%</p>
                          <p className="text-xs text-gray-600">Progress</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-600">{assignment.totalXp}</p>
                          <p className="text-xs text-gray-600">XP Earned</p>
                        </div>
                        
                        <Badge className={
                          assignment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          assignment.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {assignment.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Progress value={assignment.overallProgress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">No Assignments Yet</h3>
              <p className="text-gray-600 mb-4">This module hasn't been assigned to any students yet.</p>
              <Link href={`/study/modules/${module.id}/assign`}>
                <Button>
                  <Users className="h-4 w-4 mr-2" />
                  Assign to Students
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Module Information</CardTitle>
              <CardDescription>Basic information about this study module</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Title</label>
                  <p className="text-sm text-gray-900">{module.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Topic</label>
                  <p className="text-sm text-gray-900">{module.topic}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  <p className="text-sm text-gray-900">{module.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Grade Level</label>
                  <p className="text-sm text-gray-900">Grade {module.gradeLevel}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Difficulty</label>
                  <p className="text-sm text-gray-900 capitalize">{module.difficulty}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">
                    {new Date(module.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Gamification Settings</CardTitle>
              <CardDescription>XP, lives, and completion requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">XP Reward</label>
                  <p className="text-sm text-gray-900">{module.xpReward} XP</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Passing Score</label>
                  <p className="text-sm text-gray-900">{module.passingScore}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Lives</label>
                  <p className="text-sm text-gray-900">{module.maxLives} lives</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}