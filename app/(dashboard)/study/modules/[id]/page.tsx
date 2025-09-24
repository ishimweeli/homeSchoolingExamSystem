'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Heart,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Zap,
  Star,
  BookOpen,
  CheckCircle,
  XCircle,
  Volume2,
  Loader2,
  Lock,
  Sparkles,
  Target,
  Award
} from 'lucide-react';

interface StudyModule {
  id: string;
  title: string;
  description: string;
  topic: string;
  subject: string;
  gradeLevel: number;
  totalLessons: number;
  passingScore: number;
  livesEnabled: boolean;
  maxLives: number;
  xpReward: number;
  lessons: StudyLesson[];
}

interface StudyLesson {
  id: string;
  lessonNumber: number;
  title: string;
  content: any;
  minScore: number;
  maxAttempts: number;
  xpReward: number;
  steps: StudyStep[];
}

interface StudyStep {
  id: string;
  stepNumber: number;
  type: string;
  title: string;
  content: any;
  passingScore: number;
}

interface UserProgress {
  currentLesson: number;
  currentStep: number;
  totalXP: number;
  livesRemaining: number;
  streak: number;
  completedLessons: string[];
  badges: string[];
}

export default function StudyModulePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<StudyModule | null>(null);
  const [progress, setProgress] = useState<UserProgress>({
    currentLesson: 0,
    currentStep: 0,
    totalXP: 0,
    livesRemaining: 3,
    streak: 0,
    completedLessons: [],
    badges: []
  });
  
  // Current lesson and step states
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [fillBlanks, setFillBlanks] = useState<{[key: number]: string}>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [stepScore, setStepScore] = useState(0);
  const [stepQuestionIndex, setStepQuestionIndex] = useState(0);
  const [stepAnswers, setStepAnswers] = useState<boolean[]>([]);

  useEffect(() => {
    if (params.id) {
      fetchModuleAndProgress();
    }
  }, [params.id]);

  const fetchModuleAndProgress = async () => {
    try {
      // Fetch module data
      const moduleRes = await fetch(`/api/study-modules/${params.id}`);
      if (moduleRes.ok) {
        const moduleData = await moduleRes.json();
        setModule(moduleData.module || moduleData);
      }

      // Fetch user progress
      const progressRes = await fetch(`/api/study-modules/${params.id}/progress`);
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setProgress(progressData);
      }
    } catch (error) {
      console.error('Error fetching module:', error);
      toast.error('Failed to load study module');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLesson = () => {
    if (!module || !module.lessons || module.lessons.length === 0) return null;
    const lessonIndex = Math.min(progress.currentLesson, module.lessons.length - 1);
    return module.lessons[lessonIndex];
  };

  const getCurrentStep = () => {
    const lesson = getCurrentLesson();
    if (!lesson || !lesson.steps || lesson.steps.length === 0) return null;
    const stepIndex = Math.min(progress.currentStep, lesson.steps.length - 1);
    return lesson.steps[stepIndex];
  };

  const calculateOverallProgress = () => {
    if (!module) return 0;
    const allLessons = module.lessons || [];
    const totalSteps = allLessons.reduce((sum, l) => sum + (l.steps?.length || 0), 0) || 1;
    const completedStepsBefore = allLessons
      .slice(0, Math.max(0, progress.currentLesson))
      .reduce((sum, l) => sum + (l.steps?.length || 0), 0);
    const completedSteps = Math.max(0, Math.min(totalSteps, completedStepsBefore + progress.currentStep));
    return Math.floor((completedSteps / totalSteps) * 100);
  };

  const saveProgress = async (options?: { includeCurrentStep?: boolean; moduleCompleted?: boolean }) => {
    try {
      await fetch(`/api/study-modules/${params.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...progress,
          includeCurrentStepCompleted: !!options?.includeCurrentStep,
          moduleCompleted: !!options?.moduleCompleted
        })
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleAnswerSubmit = () => {
    const step = getCurrentStep();
    if (!step) return;

    let correct = false;
    const { content } = step;

    if (step.type === 'PRACTICE_EASY' || step.type === 'PRACTICE_MEDIUM' || step.type === 'PRACTICE_HARD') {
      const currentQuestion = content.questions?.[stepQuestionIndex];
      if (!currentQuestion) return;

      if (currentQuestion.type === 'multipleChoice') {
        correct = selectedAnswer === currentQuestion.correctAnswer;
      } else if (currentQuestion.type === 'fillBlank' || currentQuestion.type === 'mixed') {
        const userAnswer = fillBlanks[0] || '';
        const acceptableAnswers = currentQuestion.acceptableAnswers || [currentQuestion.correctAnswer];
        correct = acceptableAnswers.some((ans: string) =>
          userAnswer.toLowerCase().trim() === ans.toLowerCase().trim()
        );
      }

      setIsCorrect(correct);
      setShowFeedback(true);
      setStepAnswers([...stepAnswers, correct]);

      // Lose a life if incorrect
      if (!correct && progress.livesRemaining > 0) {
        setProgress(prev => ({ ...prev, livesRemaining: prev.livesRemaining - 1 }));
        
        if (progress.livesRemaining === 1) {
          toast.error('Game Over! No lives remaining.');
          setTimeout(() => {
            router.push('/study');
          }, 2000);
          return;
        }
      }

      // Move to next question after feedback
      setTimeout(() => {
        setShowFeedback(false);
        setSelectedAnswer('');
        setFillBlanks({});
        
        if (stepQuestionIndex < content.questions.length - 1) {
          setStepQuestionIndex(stepQuestionIndex + 1);
        } else {
          // Step complete - check if passed
          const correctCount = stepAnswers.filter(a => a).length + (correct ? 1 : 0);
          const percentage = (correctCount / content.questions.length) * 100;
          
          if (percentage >= step.passingScore) {
            handleStepComplete();
          } else {
            toast.error(`You need ${step.passingScore}% to pass. You got ${Math.round(percentage)}%. Try again!`);
            // Reset step
            setStepQuestionIndex(0);
            setStepAnswers([]);
          }
        }
      }, 2000);
    } else if (step.type === 'THEORY') {
      // Theory steps just need to be read
      handleStepComplete();
    }
  };

  const handleStepComplete = () => {
    const lesson = getCurrentLesson();
    if (!lesson) return;

    // Award XP
    const xpGained = 10;
    setProgress(prev => ({ ...prev, totalXP: prev.totalXP + xpGained }));
    toast.success(`+${xpGained} XP!`);

    // Move to next step or lesson
    if (progress.currentStep < lesson.steps.length - 1) {
      setProgress(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
      setStepQuestionIndex(0);
      setStepAnswers([]);
    } else {
      // Lesson complete!
      handleLessonComplete();
    }

    saveProgress({ includeCurrentStep: true });
  };

  const handleLessonComplete = () => {
    const lesson = getCurrentLesson();
    if (!lesson || !module) return;

    // Award lesson XP
    const xpGained = lesson.xpReward || 50;
    setProgress(prev => ({
      ...prev,
      totalXP: prev.totalXP + xpGained,
      completedLessons: [...prev.completedLessons, lesson.id],
      streak: prev.streak + 1
    }));

    toast.success(`🎉 Lesson Complete! +${xpGained} XP!`);

    // Check for badges
    if (progress.completedLessons.length + 1 === 5) {
      setProgress(prev => ({ ...prev, badges: [...prev.badges, 'FIRST_FIVE'] }));
      toast.success('🏆 New Badge: First Five Lessons!');
    }

    // Move to next lesson
    if (progress.currentLesson < module.lessons.length - 1) {
      setProgress(prev => ({
        ...prev,
        currentLesson: prev.currentLesson + 1,
        currentStep: 0,
        livesRemaining: module.maxLives // Reset lives for new lesson
      }));
      setStepQuestionIndex(0);
      setStepAnswers([]);
    } else {
      // Module complete!
      // Award a celebratory "flowers" badge locally and persist completion
      setProgress(prev => ({ ...prev, badges: [...prev.badges, 'FLOWERS'] }));
      toast.success('🎊 Congratulations! You completed the entire module! 🌸🌼🌺');
      // Persist with completion flag so backend sets 100% and status
      saveProgress({ includeCurrentStep: true, moduleCompleted: true });
      setTimeout(() => {
        router.push('/study');
      }, 2500);
    }

    // For non-final lessons we already persisted above
  };

  // Determine lesson locking states: only current and completed lessons are open
  const getLessonLockStates = () => {
    if (!module) return [] as { id: string; title: string; locked: boolean; active: boolean; completed: boolean }[];
    return module.lessons.map((l, idx) => {
      const isCurrent = idx === progress.currentLesson;
      const isCompleted = idx < progress.currentLesson;
      const locked = idx > progress.currentLesson; // future lessons locked
      return { id: l.id, title: l.title, locked, active: isCurrent, completed: isCompleted };
    });
  };

  const renderStepContent = () => {
    const step = getCurrentStep();
    if (!step) return null;

    if (step.type === 'THEORY') {
      return (
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">{step.content.explanation}</h3>
            
            {step.content.examples && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Examples:</h4>
                <ul className="space-y-2">
                  {step.content.examples.map((example: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step.content.keyPoints && (
              <div className="mt-4 bg-white rounded-lg p-4">
                <h4 className="font-semibold mb-2">Key Points:</h4>
                <ul className="space-y-1">
                  {step.content.keyPoints.map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <span className="text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Button 
            onClick={handleStepComplete}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
          >
            Continue <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      );
    }

    if (step.type.startsWith('PRACTICE')) {
      const question = step.content.questions?.[stepQuestionIndex];
      if (!question) return null;

      return (
        <div className="space-y-6">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">
              Question {stepQuestionIndex + 1} of {step.content.questions.length}
            </p>
            <Progress 
              value={(stepQuestionIndex / step.content.questions.length) * 100} 
              className="mt-2"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{question.question}</h3>

            {question.type === 'multipleChoice' && (
              <div className="space-y-3">
                {question.options.map((option: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAnswer(option)}
                    disabled={showFeedback}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border-2 transition-all",
                      selectedAnswer === option
                        ? showFeedback
                          ? isCorrect && option === question.correctAnswer
                            ? "bg-green-100 border-green-500"
                            : !isCorrect && option === selectedAnswer
                            ? "bg-red-100 border-red-500"
                            : option === question.correctAnswer
                            ? "bg-green-100 border-green-500"
                            : "bg-white border-gray-300"
                          : "bg-blue-50 border-blue-500"
                        : "bg-white border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {showFeedback && (
                        <>
                          {option === question.correctAnswer && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {option === selectedAnswer && !isCorrect && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {(question.type === 'fillBlank' || question.type === 'mixed') && (
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder={question.hint || "Type your answer..."}
                  value={fillBlanks[0] || ''}
                  onChange={(e) => setFillBlanks({ 0: e.target.value })}
                  disabled={showFeedback}
                  className={cn(
                    "text-lg",
                    showFeedback && (
                      isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                    )
                  )}
                />
              </div>
            )}

            {showFeedback && (
              <div className={cn(
                "mt-4 p-4 rounded-lg",
                isCorrect ? "bg-green-100" : "bg-red-100"
              )}>
                <p className="font-semibold">
                  {isCorrect ? question.encouragement || "Great job!" : "Not quite right."}
                </p>
                <p className="text-sm mt-1">
                  {question.explanation}
                </p>
              </div>
            )}
          </div>

          {!showFeedback && (
            <Button
              onClick={handleAnswerSubmit}
              disabled={!selectedAnswer && !fillBlanks[0]}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600"
            >
              Check Answer
            </Button>
          )}
        </div>
      );
    }

    // Fallback for QUIZ, REVIEW, CHALLENGE or any unknown step types
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
          {step.content?.explanation && (
            <p className="text-sm text-gray-700">{step.content.explanation}</p>
          )}
          {!step.content?.explanation && (
            <p className="text-sm text-gray-700">
              Review this step, then click Complete to continue.
            </p>
          )}
        </div>

        <Button 
          onClick={handleStepComplete}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
        >
          Complete Step <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-12">
        <p>Module not found</p>
      </div>
    );
  }

  const currentLesson = getCurrentLesson();
  const currentStep = getCurrentStep();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{module.title}</h1>
            <p className="text-purple-100 mt-1">
              {currentLesson?.title} • Step {progress.currentStep + 1}
            </p>
          </div>
          
          {/* Lives */}
          {module.livesEnabled && (
            <div className="flex gap-2">
              {Array.from({ length: module.maxLives }).map((_, idx) => (
                <Heart
                  key={idx}
                  className={cn(
                    "h-8 w-8",
                    idx < progress.livesRemaining
                      ? "fill-red-500 text-red-500"
                      : "text-red-300"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              <span className="font-semibold">{progress.totalXP} XP</span>
            </div>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="font-semibold">{progress.streak} Streak</span>
            </div>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              <span className="font-semibold">{progress.badges.length} Badges</span>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Overall Progress</span>
            <span className="font-semibold">{calculateOverallProgress()}%</span>
          </div>
          <Progress 
            value={calculateOverallProgress()}
            className="h-2"
          />
        </div>
      </div>

      {/* Lesson Navigator (Locked/Active/Completed) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {getLessonLockStates().map((l, idx) => (
          <button
            key={l.id}
            disabled={l.locked}
            onClick={() => {
              if (!l.locked) setProgress(prev => ({ ...prev, currentLesson: idx, currentStep: 0 }));
            }}
            className={cn(
              "p-3 rounded-lg border text-left transition-colors",
              l.completed && "bg-green-50 border-green-300",
              l.active && !l.completed && "bg-purple-50 border-purple-300",
              l.locked && "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm truncate">Lesson {idx + 1}</span>
              {l.locked ? (
                <Lock className="h-4 w-4" />
              ) : l.completed ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-purple-600" />
              )}
            </div>
            <div className="text-xs mt-1 truncate">{module?.lessons[idx]?.title}</div>
          </button>
        ))}
      </div>

      {/* Lesson Path */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto py-4">
        {currentLesson?.steps.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all",
                idx < progress.currentStep
                  ? "bg-green-500 text-white"
                  : idx === progress.currentStep
                  ? "bg-purple-600 text-white ring-4 ring-purple-200"
                  : "bg-gray-200 text-gray-500"
              )}
            >
              {idx < progress.currentStep ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                idx + 1
              )}
            </div>
            {idx < currentLesson.steps.length - 1 && (
              <div
                className={cn(
                  "w-12 h-1",
                  idx < progress.currentStep ? "bg-green-500" : "bg-gray-300"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep?.type === 'THEORY' && <BookOpen className="h-5 w-5" />}
            {currentStep?.type === 'PRACTICE_EASY' && <Target className="h-5 w-5 text-green-500" />}
            {currentStep?.type === 'PRACTICE_MEDIUM' && <Target className="h-5 w-5 text-yellow-500" />}
            {currentStep?.type === 'PRACTICE_HARD' && <Target className="h-5 w-5 text-red-500" />}
            {currentStep?.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Exit Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={async () => {
            await saveProgress();
            router.push('/study');
          }}
        >
          Save & Exit
        </Button>
      </div>
    </div>
  );
}