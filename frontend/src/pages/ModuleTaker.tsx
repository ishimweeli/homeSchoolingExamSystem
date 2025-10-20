import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'sonner';
import MatchingActivity from '../components/MatchingActivity';
import {
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import RichText from '../components/RichText';

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

  // ⚠️ ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const [module, setModule] = useState<Module | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<any>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showLessonIntro, setShowLessonIntro] = useState(true);
  const [orderingItems, setOrderingItems] = useState<string[]>([]);

  useEffect(() => {
    startModule();
  }, [id]);

  const startModule = async () => {
    try {
      const response: any = await api.post(`/study-modules/${id}/start`);
      const data: any = response.data?.data || response.data;

      const moduleData = data.assignment?.module || data.module;
      const assignmentData = data.assignment || data.progress;

      console.log('📚 Module data:', moduleData);
      console.log('📋 Assignment data:', assignmentData);

      setModule(moduleData);
      setAssignment(assignmentData);

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

    const normalizeText = (text: string): string => {
      return text
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:'"]/g, '')
        .replace(/\s+/g, ' ');
    };

    switch (content.type) {
      case 'multiple_choice':
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
        const userNormalized = normalizeText(userAnswer);
        const correctNormalized = normalizeText(content.correctAnswer);
        correct = userNormalized === correctNormalized;

        if (!correct && content.correctAnswer) {
          const correctWords = correctNormalized.split(' ').filter(w => w.length > 2);
          const userWords = userNormalized.split(' ').filter(w => w.length > 2);
          const matchingWords = correctWords.filter(word => userWords.includes(word));
          const matchPercentage = matchingWords.length / correctWords.length;
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
      case 'ordering':
        if (Array.isArray(content.correctOrder) && Array.isArray(orderingItems)) {
          correct = JSON.stringify(orderingItems) === JSON.stringify(content.correctOrder);
        }
        break;
      default:
        correct = true;
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    if (!correct && assignment && module?.livesEnabled) {
      const newLives = Math.max(0, assignment.lives - 1);
      setAssignment({ ...assignment, lives: newLives });
      toast.error('❌ Wrong! Lost 1 life. Try again!');

      if (newLives === 0) {
        toast.error('💔 Out of lives! Restarting lesson...');
        setTimeout(() => {
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

    setShowFeedback(false);
    setUserAnswer('');
    setIsCorrect(false);
    setOrderingItems([]);

    const currentLesson = module.lessons[currentLessonIndex];

    let newLessonIndex = currentLessonIndex;
    let newStepIndex = currentStepIndex;
    let xpEarned = 0;

    if (currentStepIndex < currentLesson.steps.length - 1) {
      newStepIndex = currentStepIndex + 1;
      setCurrentStepIndex(newStepIndex);
    } else if (currentLessonIndex < module.lessons.length - 1) {
      newLessonIndex = currentLessonIndex + 1;
      newStepIndex = 0;
      xpEarned = 10;
      setCurrentLessonIndex(newLessonIndex);
      setCurrentStepIndex(newStepIndex);
      toast.success(`🎉 Lesson ${currentLessonIndex + 1} completed! +10 XP`);
      setShowLessonIntro(true);
    } else {
      toast.success('🏆 Module completed! Congratulations!');
      try {
        await api.post(`/study-modules/${id}/progress`, {
          currentLesson: currentLesson.lessonNumber,
          currentStep: currentLesson.steps.length,
          xpEarned: 0,
        });
      } catch (err) {
        console.error('Failed to save final progress:', err);
      }
      navigate('/modules');
      return;
    }

    try {
      console.log(`💾 Saving: Lesson ${newLessonIndex + 1}, Step ${newStepIndex + 1}`);
      const response: any = await api.post(`/study-modules/${id}/progress`, {
        currentLesson: newLessonIndex + 1,
        currentStep: newStepIndex + 1,
        xpEarned,
      });

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

  // NOW all early returns happen AFTER all hooks are declared
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

    if (showLessonIntro) {
      const lesson = currentLesson;

      return (
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-blue-900 mb-3">
              {lesson.title}
            </h2>
            <RichText
              html={lesson.content.theory}
              className="text-gray-700 leading-relaxed"
            />
          </div>

          {lesson.content.examples?.length > 0 && (
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-3">💡 Examples:</h3>
              <ul className="space-y-2">
                {lesson.content.examples.map((ex: string, i: number) => (
                  <li key={i} className="text-gray-700 flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <RichText
                      html={ex}
                      className="text-gray-700 leading-relaxed"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lesson.content.keyTerms?.length > 0 && (
            <div className="bg-yellow-50 p-6 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-3">🧩 Key Terms</h3>
              <ul className="space-y-1">
                {lesson.content.keyTerms.map((term: string, i: number) => (
                  <li key={i} className="text-gray-700">
                    <RichText
                      html={term}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lesson.content.objectives?.length > 0 && (
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-3">🎯 Learning Objectives</h3>
              <ul className="space-y-1">
                {lesson.content.objectives.map((obj: string, i: number) => (
                  <li key={i} className="text-gray-700">
                    <RichText
                      html={obj}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(lesson.content.encouragingFeedback) && lesson.content.encouragingFeedback.length > 0 && (
            <div className="bg-pink-50 p-6 rounded-lg">
              <h3 className="font-semibold text-pink-900 mb-3">💬 Motivation</h3>
              <ul className="space-y-1">
                {lesson.content.encouragingFeedback.map((msg: string, i: number) => (
                  <li key={i} className="text-gray-700 italic">"{msg}"</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => setShowLessonIntro(false)}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold text-lg hover:shadow-lg transition"
          >
            Start Lesson →
          </button>
        </div>
      );
    }

    if (currentStep.type === 'THEORY') {
      return (
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-blue-900 mb-3">
              📚 {currentStep.title}
            </h3>
            <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
              <RichText
                html={content.text}
                className="text-gray-700 leading-relaxed"
              />
            </p>
          </div>

          {content.examples && content.examples.length > 0 && (
            <div className="bg-green-50 p-6 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-3">💡 Examples:</h4>
              <ul className="space-y-2">
                {content.examples.map((example: string, i: number) => (
                  <li key={i} className="text-gray-700 flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <RichText
                      html={example}
                      className="text-gray-700 leading-relaxed"
                    />
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

    if (currentStep.type.includes('PRACTICE') || currentStep.type === 'QUIZ') {
      return (
        <div className="space-y-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <p className='text-lg font-boldzz'>Explanation</p>
            <p className=' font-sans my-4'>
              <RichText
                html={content.learningText}
                className="text-gray-700 leading-relaxed"
              />
            </p>
          </div>

          <div className="bg-white border-2 border-purple-200 rounded-lg p-6 ">
            <h3 className=" font-bold text-gray-900 mb-4">
              {currentStep.title}
            </h3>
            <p className=" text-gray-700 mb-6">
              {content.question || content.statement}
            </p>

            {content.type === 'multiple_choice' && content.options && (
              <div className="space-y-3">
                {content.options.map((option: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setUserAnswer(option)}
                    disabled={showFeedback}
                    className={`w-full p-4 text-left rounded-lg border-2 transition hover:bg-purple-600 hover:text-white ${userAnswer === option
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-400'
                      } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="font-medium">{String.fromCharCode(65 + i)}.</span>{' '}
                    {option}
                  </button>
                ))}
              </div>
            )}

            {(content.type === 'fill-in-the-blank' ||
              content.type === 'fill_in_blank' ||
              content.type === 'text_entry') && (
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={showFeedback}
                  placeholder="Type your answer..."
                  className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none text-lg"
                />
              )}

            {content.type === 'true_false' && (
              <div className="flex gap-4">
                <button
                  onClick={() => setUserAnswer('True')}
                  disabled={showFeedback}
                  className={`flex-1 p-6 rounded-lg border-2 text-lg font-semibold transition ${userAnswer === 'True'
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-green-400'
                    }`}
                >
                  ✓ True
                </button>
                <button
                  onClick={() => setUserAnswer('False')}
                  disabled={showFeedback}
                  className={`flex-1 p-6 rounded-lg border-2 text-lg font-semibold transition ${userAnswer === 'False'
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-gray-300 hover:border-red-400'
                    }`}
                >
                  ✗ False
                </button>
              </div>
            )}

            {content.type === 'matching' && content.pairs && (
              <MatchingActivity
                content={content}
                showFeedback={showFeedback}
                onCheck={(matches, isCorrect) => {
                  setUserAnswer(matches);
                  setIsCorrect(isCorrect);
                  setShowFeedback(true);

                  if (!isCorrect && assignment && module?.livesEnabled) {
                    const newLives = Math.max(0, (assignment.lives || module.maxLives) - 1);
                    setAssignment({ ...assignment, lives: newLives });
                    toast.error('❌ Some matches are incorrect. Lost 1 life.');
                  } else if (isCorrect) {
                    toast.success('✅ Correct matches!');
                  }
                }}
                revealCorrectOnFail={true}
              />
            )}

            {/* ORDERING Question Type */}
            {content.type === 'ordering' && content.items && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-3">
                  Click the items in the correct order from first to last
                </p>
                <div className="space-y-2">
                  {content.items.map((item: string, index: number) => {
                    const isSelected = orderingItems.includes(item);
                    const selectedIndex = orderingItems.indexOf(item);

                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (!showFeedback) {
                            if (isSelected) {
                              // Remove item and all items after it
                              setOrderingItems(orderingItems.slice(0, selectedIndex));
                            } else {
                              // Add item to the end
                              setOrderingItems([...orderingItems, item]);
                            }
                          }
                        }}
                        disabled={showFeedback}
                        className={`w-full p-4 text-left rounded-lg border-2 transition flex items-center justify-between ${isSelected
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-300 hover:border-purple-400'
                          } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center">
                          <DragIcon className="mr-3 text-gray-400" />
                          <span>{item}</span>
                        </div>
                        {isSelected && (
                          <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                            {selectedIndex + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {orderingItems.length > 0 && !showFeedback && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Your Order:</p>
                    <p className="text-gray-700">
                      {orderingItems.map((item, idx) => (
                        <span key={idx}>
                          {idx + 1}. {item}
                          {idx < orderingItems.length - 1 ? ' → ' : ''}
                        </span>
                      ))}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {showFeedback && (
            <div
              className={`p-6  backdrop-blur-md transition-all duration-500 ${isCorrect
                ? 'border-green-400/60 animate-fade-in'
                : 'border-red-400/60  animate-shake'
                }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${isCorrect
                    ? 'bg-green-500 text-white animate-bounce'
                    : ' text-white'
                    }`}
                >
                  {isCorrect ? '🎊' : '❌'}
                </div>

                <div>
                  <h3
                    className={`text-2xl font-extrabold ${isCorrect ? 'text-green-500' : 'text-red-500'
                      }`}
                  >
                    {isCorrect ? 'Great Job!' : 'Not Quite There'}
                  </h3>
                  <p
                    className={`font-medium ${isCorrect ? 'text-green-800/80' : 'text-red-800/80'
                      }`}
                  >
                    {isCorrect ? 'You nailed it!' : 'Review the explanation and try again.'}
                  </p>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border ${isCorrect
                  ? 'bg-green-100/80 border-green-200'
                  : 'bg-red-100/80 border-red-200'
                  }`}
              >
                <p
                  className={`text-base leading-relaxed ${isCorrect ? 'text-green-900' : 'text-red-900'
                    }`}
                >
                  <RichText
                    html={content.explanation}
                  />
                </p>
              </div>

              {!isCorrect && content.correctAnswer && (
                <div className="mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 text-xl">💡</span>
                    <div>
                      <p className="font-semibold text-blue-900">Correct Answer:</p>
                      <p className="text-gray-800 font-medium">
                        {typeof content.correctAnswer === 'object'
                          ? JSON.stringify(content.correctAnswer)
                          : content.correctAnswer}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isCorrect && content.type === 'ordering' && content.correctOrder && (
                <div className="mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 text-xl">📋</span>
                    <div>
                      <p className="font-semibold text-blue-900 mb-2">Correct Order:</p>
                      <div className="space-y-1">
                        {content.correctOrder.map((item: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center text-gray-800 text-sm font-medium"
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold mr-2">
                              {idx + 1}
                            </span>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!showFeedback ? (
            <button
              onClick={checkAnswer}
              disabled={
                content.type === 'ordering'
                  ? orderingItems.length !== content.items?.length
                  : !userAnswer
              }
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✅ Check Answer
            </button>
          ) : isCorrect ? (
            <button
              onClick={nextStep}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              🚀 Continue
            </button>
          ) : (
            <button
              onClick={() => {
                toast.error('❌ Incorrect! Restarting from Step 1...');
                setCurrentStepIndex(0);
                setShowFeedback(false);
                setUserAnswer('');
                setIsCorrect(false);
                setOrderingItems([]);
              }}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
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
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
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

          <div className="flex items-center space-x-3">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className=" font-semibold text-gray-600">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-center items-center gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className=" text-purple-600 font-semibold mb-1">
                      Lesson {currentLessonIndex + 1} of {module.lessons.length}
                    </p>
                    <h2 className="text-2xl font-bold text-gray-900">{currentLesson.title}</h2>
                  </div>
                  <div className="text-right">
                    <p className=" text-gray-500">Step</p>
                    <p className="text-xl font-bold text-gray-900">
                      {currentStepIndex + 1} / {currentLesson.steps.length}
                    </p>
                  </div>
                </div>
              </div>

              {renderStepContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}