import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';

interface QuestionType {
  type: string;
  label: string;
  icon: string;
  count: number;
}

export default function ExamCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentTab, setCurrentTab] = useState<'manual' | 'ai'>('ai');
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [examStatus] = useState<'draft' | 'published'>('draft');

  // Exam configuration
  const [examConfig, setExamConfig] = useState({
    title: '',
    subject: '',
    gradeLevel: 5,
    difficulty: 'MIXED',
    duration: 60,
    topics: '',
    totalQuestions: 20
  });

  // Question types with default distribution
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([
    { type: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: '🔘', count: 8 },
    { type: 'TRUE_FALSE', label: 'True/False', icon: '✅', count: 3 },
    { type: 'SHORT_ANSWER', label: 'Short Answer', icon: '✍️', count: 3 },
    { type: 'FILL_BLANKS', label: 'Fill in the Blanks', icon: '📝', count: 2 },
    { type: 'MATCHING', label: 'Matching', icon: '🔗', count: 2 },
    { type: 'SELECT_ALL', label: 'Select All That Apply', icon: '☑️', count: 2 }
  ]);

  const getTotalQuestions = () => questionTypes.reduce((sum, qt) => sum + qt.count, 0);

  const updateQuestionCount = (type: string, delta: number) => {
    setQuestionTypes(prev =>
      prev.map(qt =>
        qt.type === type
          ? { ...qt, count: Math.max(0, Math.min(10, qt.count + delta)) }
          : qt
      )
    );
  };

  const generateMockQuestion = (type: string, index: number) => {
    const mockQuestions: any = {
      'MULTIPLE_CHOICE': {
        question: `Sample multiple choice question ${index}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        marks: 2,
        type: 'MULTIPLE_CHOICE'
      },
      'TRUE_FALSE': {
        question: `Sample true/false statement ${index}`,
        correctAnswer: 'True',
        marks: 1,
        type: 'TRUE_FALSE'
      },
      'SHORT_ANSWER': {
        question: `Sample short answer question ${index}`,
        sampleAnswer: 'Sample answer',
        marks: 3,
        type: 'SHORT_ANSWER'
      },
      'FILL_BLANKS': {
        question: `Sample fill in the _____ question ${index}`,
        blanks: ['blank'],
        marks: 2,
        type: 'FILL_BLANKS'
      },
      'MATCHING': {
        question: `Sample matching question ${index}`,
        leftItems: ['Item 1', 'Item 2'],
        rightItems: ['Match A', 'Match B'],
        marks: 4,
        type: 'MATCHING'
      },
      'SELECT_ALL': {
        question: `Sample select all that apply ${index}`,
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctAnswers: ['Option 1', 'Option 3'],
        marks: 3,
        type: 'SELECT_ALL'
      }
    };

    return mockQuestions[type] || mockQuestions['MULTIPLE_CHOICE'];
  };

  const generateExam = async () => {
    if (!examConfig.title || !examConfig.subject || !examConfig.topics) {
      setError('Please fill in all required fields');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      // Calculate total question count
      const totalQuestions = questionTypes.reduce((sum, qt) => sum + qt.count, 0);

      // Format question types for the backend (just the type names, not objects)
      const selectedQuestionTypes = questionTypes
        .filter(qt => qt.count > 0)
        .map(qt => qt.type);

      // Handle MIXED difficulty - if MIXED, use MEDIUM as default for backend
      const difficultyForBackend = examConfig.difficulty === 'MIXED' ? 'MEDIUM' : examConfig.difficulty;

      const payload = {
        ...examConfig,
        questionCount: totalQuestions,
        difficulty: difficultyForBackend,
        questionTypes: selectedQuestionTypes,
        topics: examConfig.topics.split(',').map(t => t.trim()),
        // If mixed, tell backend to vary difficulty
        mixedDifficulty: examConfig.difficulty === 'MIXED'
      };

      const response = await api.post('/exams/generate', payload);

      // api.post returns the top-level JSON already
      if ((response as any)?.success) {
        const data = (response as any).data;
        const questions = data?.questions || [];
        if (!questions.length) {
          setError('No questions were generated. Please check your API configuration.');
          setGeneratedQuestions([]);
        } else {
          setGeneratedQuestions(questions);
          setSuccess('Exam generated successfully! Review and edit as needed.');
        }
      } else {
        const message = (response as any)?.message || (response as any)?.error || 'Failed to generate exam';
        setError(message);
        setGeneratedQuestions([]);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to connect to AI service';
      setError(message);
      setGeneratedQuestions([]);
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setGeneratedQuestions(prev =>
      prev.map((q, i) => i === index ? { ...q, [field]: value } : q)
    );
  };

  const publishExam = async () => {
    if (generatedQuestions.length === 0) {
      toast.error('Please generate questions first');
      return;
    }

    setLoading(true);

    try {
      const examData = {
        ...examConfig,
        questions: generatedQuestions,
        status: 'PUBLISHED'
      };

      const response = await api.post('/exams', examData);

      if ((response as any)?.success) {
        toast.success('Exam published successfully');
        navigate('/exams');
      } else {
        const message = (response as any)?.message || (response as any)?.error || 'Failed to publish exam';
        toast.error(message);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to publish exam';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    setLoading(true);
    try {
      const examData = {
        ...examConfig,
        questions: generatedQuestions,
        status: 'DRAFT'
      };

      const response = await api.post('/exams', examData);
      if ((response as any)?.success) {
        toast.success('Draft saved successfully');
      } else {
        const message = (response as any)?.message || (response as any)?.error || 'Failed to save draft';
        toast.error(message);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to save draft';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Create Exam</h1>
            <p className="text-gray-600 mt-1">AI-powered exam generation in 10 seconds</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 relative">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">AI Generation Issue</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="ml-auto pl-3 hover:text-red-900"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-6 relative">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-green-800 font-medium">{success}</p>
                </div>
                <button
                  onClick={() => setSuccess('')}
                  className="ml-auto pl-3 hover:text-green-900"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button
              onClick={() => setCurrentTab('manual')}
              className={`px-4 py-2 font-medium ${
                currentTab === 'manual'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              MANUAL CREATION
            </button>
            <button
              onClick={() => setCurrentTab('ai')}
              className={`px-4 py-2 font-medium flex items-center gap-2 ${
                currentTab === 'ai'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ✨ AI GENERATION
            </button>
          </div>

          {currentTab === 'ai' && (
            <>
              {/* Configuration Section */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exam Title *
                      </label>
                      <input
                        type="text"
                        value={examConfig.title}
                        onChange={(e) => setExamConfig({...examConfig, title: e.target.value})}
                        placeholder="Exam Title *"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject *
                      </label>
                      <input
                        type="text"
                        value={examConfig.subject}
                        onChange={(e) => setExamConfig({...examConfig, subject: e.target.value})}
                        placeholder="Subject *"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Topics (comma-separated) *
                      </label>
                      <textarea
                        value={examConfig.topics}
                        onChange={(e) => setExamConfig({...examConfig, topics: e.target.value})}
                        placeholder="e.g., Fractions, Decimals, Geometry"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Grade Level</label>
                        <select
                          value={examConfig.gradeLevel}
                          onChange={(e) => setExamConfig({...examConfig, gradeLevel: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>Grade {i + 1}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Difficulty</label>
                        <select
                          value={examConfig.difficulty}
                          onChange={(e) => setExamConfig({...examConfig, difficulty: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="EASY">Easy</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HARD">Hard</option>
                          <option value="MIXED">Mixed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Duration (min)</label>
                        <input
                          type="number"
                          value={examConfig.duration}
                          onChange={(e) => setExamConfig({...examConfig, duration: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border rounded-lg"
                          min="15"
                          max="180"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question Types Distribution */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Question Types
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      (Total: {getTotalQuestions()} questions)
                    </span>
                  </h3>

                  <div className="space-y-2">
                    {questionTypes.map(qt => (
                      <div key={qt.type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{qt.icon}</span>
                          <span className="text-sm font-medium">{qt.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuestionCount(qt.type, -1)}
                            className="w-7 h-7 rounded-full bg-white border hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-semibold">{qt.count}</span>
                          <button
                            onClick={() => updateQuestionCount(qt.type, 1)}
                            className="w-7 h-7 rounded-full bg-white border hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              {generatedQuestions.length === 0 && (
                <div className="text-center py-4">
                  <button
                    onClick={generateExam}
                    disabled={generating || !examConfig.title || !examConfig.subject || !examConfig.topics}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {generating ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating with AI...
                      </span>
                    ) : (
                      '✨ Generate Exam with AI'
                    )}
                  </button>
                </div>
              )}

              {/* Generated Questions Review */}
              {generatedQuestions.length > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Generated Questions</h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        {examStatus === 'draft' ? 'DRAFT' : 'READY TO PUBLISH'}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {generatedQuestions.length} Questions
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {generatedQuestions.map((q, index) => (
                      <div key={index} className="border rounded-lg p-3 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                              {index + 1}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {q.type.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-gray-500">{q.marks} marks</span>
                          </div>
                          <button
                            onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            {editingIndex === index ? 'Done' : 'Edit'}
                          </button>
                        </div>

                        {editingIndex === index ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                              className="w-full px-3 py-2 border rounded"
                            />
                            {q.options && (
                              <div className="space-y-1">
                                {q.options.map((opt: string, i: number) => (
                                  <input
                                    key={i}
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const newOptions = [...q.options];
                                      newOptions[i] = e.target.value;
                                      updateQuestion(index, 'options', newOptions);
                                    }}
                                    className="w-full px-3 py-1 border rounded text-sm"
                                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p className="text-gray-800">{q.question}</p>
                            {q.options && (
                              <div className="mt-2 space-y-1">
                                {q.options.map((opt: string, i: number) => (
                                  <p key={i} className="text-sm text-gray-600 ml-4">
                                    {String.fromCharCode(65 + i)}. {opt}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between mt-6">
                    <button
                      onClick={() => {
                        setGeneratedQuestions([]);
                        setExamConfig({...examConfig, title: '', subject: '', topics: ''});
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Start Over
                    </button>

                    <div className="flex gap-3">
                      <button
                        onClick={saveDraft}
                        disabled={loading}
                        className="px-5 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                      >
                        Save as Draft
                      </button>
                      <button
                        onClick={publishExam}
                        disabled={loading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                      >
                        {loading ? 'Publishing...' : '🚀 Publish Exam'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {currentTab === 'manual' && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Manual creation temporarily disabled</p>
              <button
                onClick={() => setCurrentTab('ai')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Use AI Generation Instead
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}