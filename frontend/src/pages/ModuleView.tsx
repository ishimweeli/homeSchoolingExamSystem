import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Clock, Users, Award, Target, Brain,
  Play, Pause, CheckCircle, Circle, ChevronRight,
  ChevronLeft, Download, Share2, Edit, Trash2,
  ArrowLeft, Star, Calendar, BarChart, Lock,
  Unlock, MessageSquare, FileText, Video, Headphones
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

interface Module {
  id: string;
  title: string;
  subject: string;
  description: string;
  topics: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedHours: number;
  lessons: Lesson[];
  createdAt: string;
  updatedAt: string;
  author?: string;
  status: 'DRAFT' | 'PUBLISHED';
  totalStudents: number;
  averageRating: number;
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'exercise';
  duration: number;
  content: string;
  completed?: boolean;
  locked?: boolean;
}

export default function ModuleView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    fetchModule();
  }, [id]);

  const fetchModule = async () => {
    try {
      const response = await api.get(`/study-modules/${id}`);
      const moduleData = response.data?.data || response.data;

      // Ensure topics is always an array
      if (moduleData) {
        moduleData.topics = Array.isArray(moduleData.topics) ? moduleData.topics : [];
        setModule(moduleData);
      } else {
        setModule(mockModule);
      }
    } catch (error) {
      console.error('Error fetching module:', error);
      // Use mock data for demo
      setModule(mockModule);
    } finally {
      setLoading(false);
    }
  };

  const mockModule: Module = {
    id: id || '1',
    title: 'Introduction to Algebra',
    subject: 'Mathematics',
    description: 'Master the fundamentals of algebraic expressions and equations through interactive lessons and practical exercises.',
    topics: ['Variables', 'Linear Equations', 'Quadratic Equations', 'Functions', 'Graphing'],
    difficulty: 'BEGINNER',
    estimatedHours: 12,
    lessons: [
      {
        id: '1',
        title: 'Introduction to Variables',
        type: 'video',
        duration: 15,
        content: 'Learn what variables are and how they work in algebra.',
        completed: true
      },
      {
        id: '2',
        title: 'Basic Algebraic Expressions',
        type: 'text',
        duration: 10,
        content: 'Understanding how to write and simplify algebraic expressions.',
        completed: true
      },
      {
        id: '3',
        title: 'Practice: Variables and Expressions',
        type: 'exercise',
        duration: 20,
        content: 'Practice problems on variables and expressions.',
        completed: false
      },
      {
        id: '4',
        title: 'Linear Equations Basics',
        type: 'video',
        duration: 18,
        content: 'Introduction to linear equations and solving techniques.',
        completed: false,
        locked: false
      },
      {
        id: '5',
        title: 'Quiz: Linear Equations',
        type: 'quiz',
        duration: 15,
        content: 'Test your understanding of linear equations.',
        completed: false,
        locked: true
      }
    ],
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
    author: 'John Doe',
    status: 'PUBLISHED',
    totalStudents: 156,
    averageRating: 4.5
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER': return 'bg-green-100 text-green-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'text': return FileText;
      case 'quiz': return Brain;
      case 'exercise': return Edit;
      default: return FileText;
    }
  };

  const handleStartModule = () => {
    // Navigate to interactive module taker
    navigate(`/modules/${id}/take`);
  };

  const handleLessonClick = (index: number) => {
    if (!module?.lessons[index].locked) {
      setCurrentLesson(index);
    }
  };

  const handleNextLesson = () => {
    if (module && currentLesson < module.lessons.length - 1) {
      // Mark current lesson as completed
      const updatedModule = { ...module };
      updatedModule.lessons[currentLesson].completed = true;
      setModule(updatedModule);

      setCurrentLesson(currentLesson + 1);
      updateProgress();
    }
  };

  const handlePreviousLesson = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
    }
  };

  const updateProgress = () => {
    if (module) {
      const completed = module.lessons.filter(l => l.completed).length;
      const total = module.lessons.length;
      setProgress(Math.round((completed / total) * 100));
    }
  };

  const handleCompleteModule = () => {
    toast.success('Congratulations! You have completed the module!');
    navigate('/modules');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Module not found</h2>
          <button
            onClick={() => navigate('/modules')}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to Modules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 text-sm">
        <div className='flex justify-between items-center mb-4'>
          <button
            onClick={() => navigate('/modules')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Modules
          </button>

          {/* Action Buttons for Teachers */}
          {user?.role === 'TEACHER' && (
            <div className="flex justify-end gap-3 text-xs">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={() => navigate(`/modules/${id}/edit`)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Module
              </button>
            </div>
          )}
        </div>



        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(module.difficulty)}`}>
                  {module.difficulty}
                </span>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  {module.subject}
                </span>
                {module.status === 'PUBLISHED' && (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    Published
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-3">{module.title}</h1>
              <p className="text-gray-600 mb-4">{module.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {module.topics.map((topic, index) => (
                  <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    {topic}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {module.estimatedHours} hours
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {module.totalStudents} students
                </div>
                <div className="flex items-center">
                  <Star className="w-4 h-4 mr-1 text-yellow-500" />
                  {module.averageRating}/5
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Updated {new Date(module.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="ml-6">
              {!isEnrolled ? (
                <button
                  onClick={handleStartModule}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Module
                </button>
              ) : (
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{progress}%</div>
                  <div className="text-sm text-gray-600">Complete</div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {isEnrolled && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-semibold text-gray-900">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Module Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lessons List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Course Content</h2>
            <div className="space-y-2">
              {module.lessons.map((lesson, index) => {
                const Icon = getLessonIcon(lesson.type);
                const isActive = currentLesson === index;
                const isLocked = lesson.locked && !isEnrolled;

                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleLessonClick(index)}
                    disabled={isLocked}
                    className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${isActive
                      ? 'border-purple-500 bg-purple-50'
                      : isLocked
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${lesson.completed
                          ? 'bg-green-100'
                          : isActive
                            ? 'bg-purple-100'
                            : 'bg-gray-100'
                          }`}>
                          {lesson.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : isLocked ? (
                            <Lock className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-600'}`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-medium text-sm ${isActive ? 'text-purple-900' : 'text-gray-900'
                            }`}>
                            {lesson.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {lesson.duration} min • {lesson.type}
                          </p>
                        </div>
                      </div>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {isEnrolled ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {module.lessons[currentLesson] && (
                <>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {module.lessons[currentLesson].title}
                      </h2>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        {module.lessons[currentLesson].type}
                      </span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 mb-6">
                      <Clock className="w-4 h-4 mr-1" />
                      {module.lessons[currentLesson].duration} minutes
                    </div>
                  </div>

                  {/* Lesson Content */}
                  <div className="mb-8">
                    {module.lessons[currentLesson].type === 'video' && (
                      <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center">
                        <Play className="w-16 h-16 text-white opacity-50" />
                      </div>
                    )}

                    {module.lessons[currentLesson].type === 'text' && (
                      <div className="prose max-w-none">
                        <p className="text-gray-700 leading-relaxed">
                          {module.lessons[currentLesson].content}
                        </p>
                        <p className="text-gray-700 leading-relaxed mt-4">
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                        </p>
                      </div>
                    )}

                    {module.lessons[currentLesson].type === 'quiz' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <h3 className="font-semibold text-gray-900 mb-3">Question 1:</h3>
                          <p className="text-gray-700 mb-4">What is the value of x in the equation: 2x + 5 = 15?</p>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input type="radio" name="q1" className="mr-2" />
                              <span>x = 5</span>
                            </label>
                            <label className="flex items-center">
                              <input type="radio" name="q1" className="mr-2" />
                              <span>x = 10</span>
                            </label>
                            <label className="flex items-center">
                              <input type="radio" name="q1" className="mr-2" />
                              <span>x = 7.5</span>
                            </label>
                            <label className="flex items-center">
                              <input type="radio" name="q1" className="mr-2" />
                              <span>x = 20</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {module.lessons[currentLesson].type === 'exercise' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h3 className="font-semibold text-gray-900 mb-3">Exercise:</h3>
                          <p className="text-gray-700 mb-4">Solve the following problems:</p>
                          <ol className="list-decimal list-inside space-y-2 text-gray-700">
                            <li>Simplify: 3x + 2x - x</li>
                            <li>Solve for y: y + 7 = 12</li>
                            <li>Calculate: 4(x + 3) when x = 2</li>
                          </ol>
                          <textarea
                            className="w-full mt-4 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            rows={4}
                            placeholder="Write your answers here..."
                          ></textarea>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                    <button
                      onClick={handlePreviousLesson}
                      disabled={currentLesson === 0}
                      className={`px-4 py-2 rounded-lg flex items-center ${currentLesson === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      <ChevronLeft className="w-5 h-5 mr-2" />
                      Previous
                    </button>

                    {currentLesson === module.lessons.length - 1 ? (
                      <button
                        onClick={handleCompleteModule}
                        className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
                      >
                        Complete Module
                      </button>
                    ) : (
                      <button
                        onClick={handleNextLesson}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                      >
                        Next
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <BookOpen className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Start Learning?</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Click "Start Module" to begin your journey through {module.title}.
                Track your progress and complete all lessons to earn your certificate.
              </p>
              <button
                onClick={handleStartModule}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
              >
                Start Module Now
              </button>

              <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{module.lessons.length}</div>
                  <div className="text-sm text-gray-600">Lessons</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{module.estimatedHours}h</div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    <Star className="w-6 h-6 text-yellow-500 inline" />
                  </div>
                  <div className="text-sm text-gray-600">Certificate</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}