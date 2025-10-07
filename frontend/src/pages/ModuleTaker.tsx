import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'sonner';

interface Step {
  type: string;
  title: string;
  content: any;
  stepNumber: number;
}

interface Lesson {
  lessonNumber: number;
  title: string;
  content: any;
  steps: Step[];
}

interface Module {
  id: string;
  title: string;
  description: string;
  topic: string;
  subject: string;
  difficulty: string;
  lessons: Lesson[];
  xpReward: number;
  lives: number;
  maxLives: number;
  livesEnabled?: boolean;
}

interface Assignment {
  id: string;
  currentLesson: number;
  currentStep: number;
  overallProgress: number;
  totalXp: number;
  lives: number;
  status: string;
}

export default function ModuleTaker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [module, setModule] = useState<Module | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<any>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    startModule();
  }, [id]);

  const startModule = async () => {
    try {
      const response: any = await api.post(`/study-modules/${id}/start`);
      const data: any = response.data?.data || response.data;
      
      // Module is inside assignment object
      const moduleData = data.assignment?.module || data.module;
      const assignmentData = data.assignment || data.progress;
      
      console.log('📚 Module data:', moduleData);
      console.log('📋 Assignment data:', assignmentData);
      
      setModule(moduleData);
      setAssignment(assignmentData);
      
      // Start from where user left off
      if (assignmentData) {
        const lessonIdx = (assignmentData.currentLesson || 1) - 1;
        const stepIdx = (assignmentData.currentStep || 1) - 1;
        console.log(`📍 Starting at Lesson ${lessonIdx + 1}, Step ${stepIdx + 1}`);
        setCurrentLessonIndex(lessonIdx);
        setCurrentStepIndex(stepIdx);
      }
    } catch (err: any) {
      console.error('❌ Failed to start module:', err);
      toast.error(err?.response?.data?.message || 'Failed to start module');
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = () => {
    if (!currentLesson || !currentStep) return;

    const content = currentStep.content;
    let correct = false;

    // Helper function to normalize text for comparison
    const normalizeText = (text: string): string => {
      return text
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:'"]/g, '') // Remove punctuation
        .replace(/\s+/g, ' '); // Normalize spaces
    };

    // Check based on question type
    switch (content.type) {
      case 'multiple_choice':
        // Check if answer matches (handle both "B" and "B) Full text..." formats)
        const correctAns = content.correctAnswer.trim();
        const userAns = userAnswer.trim();
        correct = userAns === correctAns || 
                  userAns.startsWith(correctAns + ')') ||
                  userAns.startsWith(correctAns + '.') ||
                  userAns === correctAns.split(')')[0].trim();
        break;
      case 'fill-in-the-blank':
      case 'fill_in_blank':
      case 'text_entry':
        // More flexible checking for text answers
        const userNormalized = normalizeText(userAnswer);
        const correctNormalized = normalizeText(content.correctAnswer);
        
        // Check for exact match after normalization
        correct = userNormalized === correctNormalized;
        
        // If not exact match, check if user answer contains the key words
        if (!correct && content.correctAnswer) {
          const correctWords = correctNormalized.split(' ').filter(w => w.length > 2);
          const userWords = userNormalized.split(' ').filter(w => w.length > 2);
          
          // If user answer contains most of the key words from correct answer, accept it
          const matchingWords = correctWords.filter(word => userWords.includes(word));
          const matchPercentage = matchingWords.length / correctWords.length;
          
          // Accept if 70% or more of key words match
          correct = matchPercentage >= 0.7;
        }
        break;
      case 'true_false':
        const userTF = normalizeText(userAnswer.toString());
        const correctTF = normalizeText(content.correctAnswer.toString());
        correct = userTF === correctTF || 
                  (userTF === 't' && correctTF === 'true') ||
                  (userTF === 'f' && correctTF === 'false');
        break;
      default:
        correct = true; // Theory steps auto-pass
    }

    setIsCorrect(correct);
    setShowFeedback(true);
    
    // If wrong answer, deduct a life
    if (!correct && assignment && module?.livesEnabled) {
      const newLives = Math.max(0, assignment.lives - 1);
      setAssignment({ ...assignment, lives: newLives });
      toast.error('❌ Wrong! Lost 1 life. Try again!');
      
      // Check if out of lives
      if (newLives === 0) {
        toast.error('💔 Out of lives! Restarting lesson...');
        setTimeout(() => {
          // Restart current lesson from step 1
          setCurrentStepIndex(0);
          setAssignment({ ...assignment, lives: module.maxLives });
          setShowFeedback(false);
          setUserAnswer('');
        }, 2000);
        return;
      }
    }
  };

  const nextStep = async () => {
    if (!module) return;

    // Clear all state before moving to next step
    setShowFeedback(false);
    setUserAnswer('');
    setIsCorrect(false);

    const currentLesson = module.lessons[currentLessonIndex];
    
    let newLessonIndex = currentLessonIndex;
    let newStepIndex = currentStepIndex;
    let xpEarned = 0;
    
    // Move to next step
    if (currentStepIndex < currentLesson.steps.length - 1) {
      newStepIndex = currentStepIndex + 1;
      setCurrentStepIndex(newStepIndex);
    } 
    // Move to next lesson
    else if (currentLessonIndex < module.lessons.length - 1) {
      newLessonIndex = currentLessonIndex + 1;
      newStepIndex = 0;
      xpEarned = 10; // Lesson completion XP
      setCurrentLessonIndex(newLessonIndex);
      setCurrentStepIndex(newStepIndex);
      toast.success(`🎉 Lesson ${currentLessonIndex + 1} completed! +10 XP`);
    } 
    // Module complete!
    else {
      toast.success('🏆 Module completed! Congratulations!');
      // Save final progress before navigating away
      try {
        await api.post(`/study-modules/${id}/progress`, {
          currentLesson: currentLesson.lessonNumber,
          currentStep: currentLesson.steps.length, // Last step
          xpEarned: 0,
        });
      } catch (err) {
        console.error('Failed to save final progress:', err);
      }
      navigate('/modules');
      return;
    }

    // Save progress to backend
    try {
      console.log(`💾 Saving: Lesson ${newLessonIndex + 1}, Step ${newStepIndex + 1}`);
      const response: any = await api.post(`/study-modules/${id}/progress`, {
        currentLesson: newLessonIndex + 1, // Backend uses 1-based indexing
        currentStep: newStepIndex + 1,
        xpEarned,
      });
      
      // Update assignment with new XP total
      if (response.data?.data && assignment) {
        setAssignment({
          ...assignment,
          totalXp: response.data.data.totalXp,
        });
      }
      
      console.log('✅ Progress saved!');
    } catch (err) {
      console.error('❌ Failed to save progress:', err);
      toast.error('Failed to save progress');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Module not found</p>
          <button onClick={() => navigate('/modules')} className="px-4 py-2 bg-purple-600 text-white rounded">
            Back to Modules
          </button>
        </div>
      </div>
    );
  }

  const currentLesson = module.lessons[currentLessonIndex];
  const currentStep = currentLesson?.steps[currentStepIndex];
  const progress = ((currentLessonIndex * 100 + (currentStepIndex / currentLesson.steps.length) * 100) / module.lessons.length);

  if (!currentStep) {
    return <div>No steps available</div>;
  }

  const renderStepContent = () => {
    const content = currentStep.content;

    // THEORY STEP
    if (currentStep.type === 'THEORY') {
      return (
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-blue-900 mb-3">📚 {currentStep.title}</h3>
            <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">{content.text}</p>
          </div>
          
          {content.examples && content.examples.length > 0 && (
            <div className="bg-green-50 p-6 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-3">💡 Examples:</h4>
              <ul className="space-y-2">
                {content.examples.map((example: string, i: number) => (
                  <li key={i} className="text-gray-700 flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={nextStep}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold text-lg hover:shadow-lg transition"
          >
            Continue →
          </button>
        </div>
      );
    }

    // PRACTICE QUESTIONS
    if (currentStep.type.includes('PRACTICE') || currentStep.type === 'QUIZ') {
      return (
        <div className="space-y-6">
          <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 {currentStep.title}</h3>
            <p className="text-lg text-gray-700 mb-6">{content.question}</p>

            {/* MULTIPLE CHOICE */}
            {content.type === 'multiple_choice' && content.options && (
              <div className="space-y-3">
                {content.options.map((option: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setUserAnswer(option)}
                    disabled={showFeedback}
                    className={`w-full p-4 text-left rounded-lg border-2 transition ${
                      userAnswer === option
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-400'
                    } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {option}
                  </button>
                ))}
              </div>
            )}

            {/* FILL IN THE BLANK */}
            {(content.type === 'fill-in-the-blank' || content.type === 'fill_in_blank' || content.type === 'text_entry') && (
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={showFeedback}
                placeholder="Type your answer..."
                className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none text-lg"
              />
            )}

            {/* TRUE/FALSE */}
            {content.type === 'true_false' && (
              <div className="flex gap-4">
                <button
                  onClick={() => setUserAnswer('True')}
                  disabled={showFeedback}
                  className={`flex-1 p-6 rounded-lg border-2 text-lg font-semibold transition ${
                    userAnswer === 'True'
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  ✓ True
                </button>
                <button
                  onClick={() => setUserAnswer('False')}
                  disabled={showFeedback}
                  className={`flex-1 p-6 rounded-lg border-2 text-lg font-semibold transition ${
                    userAnswer === 'False'
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-300 hover:border-red-400'
                  }`}
                >
                  ✗ False
                </button>
              </div>
            )}

            {/* MATCHING */}
            {content.type === 'matching' && content.pairs && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">👇 Study these pairs:</p>
                {content.pairs.map((pair: any, i: number) => (
                  <div key={i} className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border-2 border-purple-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded border-l-4 border-blue-500">
                        <p className="text-xs text-blue-600 font-semibold mb-1">ACTIVE</p>
                        <p className="text-gray-800">{pair.active}</p>
                      </div>
                      <div className="bg-white p-3 rounded border-l-4 border-purple-500">
                        <p className="text-xs text-purple-600 font-semibold mb-1">PASSIVE</p>
                        <p className="text-gray-800">{pair.passive}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setUserAnswer('understood');
                    setIsCorrect(true);
                    setShowFeedback(true);
                  }}
                  disabled={showFeedback}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                >
                  ✓ I understand these pairs
                </button>
              </div>
            )}
          </div>

          {/* FEEDBACK */}
          {showFeedback && (
            <div className={`p-6 rounded-lg border-2 ${isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <div className="flex items-center mb-3">
                {isCorrect ? (
                  <>
                    <span className="text-3xl mr-3">🎉</span>
                    <h4 className="text-xl font-bold text-green-900">Correct! Great job!</h4>
                  </>
                ) : (
                  <>
                    <span className="text-3xl mr-3">❌</span>
                    <h4 className="text-xl font-bold text-red-900">Wrong! Try again!</h4>
                  </>
                )}
              </div>
              <p className="text-gray-700 text-lg">{content.explanation}</p>
              {!isCorrect && content.correctAnswer && (
                <p className="mt-3 text-green-700 font-medium">
                  ✓ Correct answer: {content.correctAnswer}
                </p>
              )}
            </div>
          )}

          {/* ACTION BUTTONS */}
          {!showFeedback ? (
            <button
              onClick={checkAnswer}
              disabled={!userAnswer}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold text-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
          ) : isCorrect ? (
            <button
              onClick={nextStep}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold text-lg hover:shadow-lg transition"
            >
              🎯 Continue →
            </button>
          ) : (
            <button
              onClick={() => {
                // Restart from Step 1 of current lesson
                toast.error('🔄 Wrong answer! Restarting lesson from Step 1...');
                setCurrentStepIndex(0);
                setShowFeedback(false);
                setUserAnswer('');
                setIsCorrect(false); // Clear the wrong answer state
              }}
              className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold text-lg hover:shadow-lg transition"
            >
              🔄 Restart Lesson
            </button>
          )}
        </div>
      );
    }

    return <div>Unknown step type: {currentStep.type}</div>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => navigate('/modules')} className="text-purple-600 hover:text-purple-700 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Exit
            </button>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-2xl mr-2">❤️</span>
                <span className="font-bold text-red-600">{assignment?.lives || module.maxLives}</span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">⭐</span>
                <span className="font-bold text-yellow-600">{assignment?.totalXp || 0} XP</span>
              </div>
            </div>
          </div>
          
          <h1 className="text-xl font-bold text-gray-900 mb-2">{module.title}</h1>
          
          {/* PROGRESS BAR */}
          <div className="flex items-center space-x-3">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-gray-600">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT WITH SIDEBAR */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LESSON SIDEBAR */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200 sticky top-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 px-2">Lessons</h3>
              <div className="space-y-2">
                {module.lessons.map((lesson, idx) => {
                  const isCompleted = idx < currentLessonIndex;
                  const isCurrent = idx === currentLessonIndex;
                  
                  return (
                    <div
                      key={lesson.lessonNumber}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isCurrent
                          ? 'border-purple-500 bg-purple-50'
                          : isCompleted
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${
                            isCurrent ? 'text-purple-900' : isCompleted ? 'text-green-900' : 'text-gray-600'
                          }`}>
                            {lesson.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Locked'}
                          </p>
                        </div>
                      </div>
                      {isCurrent && (
                        <div className="mt-2 pt-2 border-t border-purple-200">
                          <div className="flex items-center justify-between text-xs text-purple-700">
                            <span>Step {currentStepIndex + 1}/{lesson.steps.length}</span>
                            <span>{Math.round((currentStepIndex / lesson.steps.length) * 100)}%</span>
                          </div>
                          <div className="mt-1 bg-purple-200 rounded-full h-1.5">
                            <div
                              className="bg-purple-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${(currentStepIndex / lesson.steps.length) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              {/* LESSON INFO */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-semibold mb-1">
                      Lesson {currentLessonIndex + 1} of {module.lessons.length}
                    </p>
                    <h2 className="text-2xl font-bold text-gray-900">{currentLesson.title}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Step</p>
                    <p className="text-xl font-bold text-gray-900">
                      {currentStepIndex + 1} / {currentLesson.steps.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* STEP CONTENT */}
              {renderStepContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

