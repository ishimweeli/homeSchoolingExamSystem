import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface QuestionType {
  type: string;
  label: string;
  icon: string;
  count: number;
}

export default function ExamCreateProfessional() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedExam, setGeneratedExam] = useState<any>(null);
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);

  // Exam basic info
  const [examInfo, setExamInfo] = useState({
    title: '',
    subject: '',
    gradeLevel: 5,
    difficulty: 'MIXED',
    duration: 60,
    topics: '',
    totalQuestions: 20,
    status: 'DRAFT'
  });

  // Question types configuration
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([
    { type: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: '📝', count: 8 },
    { type: 'TRUE_FALSE', label: 'True/False', icon: '✓', count: 3 },
    { type: 'SHORT_ANSWER', label: 'Short Answer', icon: '✏️', count: 3 },
    { type: 'FILL_BLANKS', label: 'Fill in the Blanks', icon: '📋', count: 2 },
    { type: 'MATCHING', label: 'Matching', icon: '🔗', count: 2 },
    { type: 'SELECT_ALL', label: 'Select All That Apply', icon: '☑️', count: 2 }
  ]);

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setExamInfo({
      ...examInfo,
      [name]: name === 'gradeLevel' || name === 'duration' || name === 'totalQuestions'
        ? parseInt(value)
        : value
    });
  };

  const updateQuestionTypeCount = (type: string, delta: number) => {
    setQuestionTypes(prev => {
      const updated = prev.map(qt =>
        qt.type === type ? { ...qt, count: Math.max(0, qt.count + delta) } : qt
      );
      return updated;
    });
  };

  const getTotalQuestions = () => {
    return questionTypes.reduce((sum, qt) => sum + qt.count, 0);
  };

  const generateExam = async () => {
    if (!examInfo.title || !examInfo.subject || !examInfo.topics) {
      setError('Please fill in all required fields');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...examInfo,
        questionTypes: questionTypes.filter(qt => qt.count > 0).map(qt => ({
          type: qt.type,
          count: qt.count
        })),
        topics: examInfo.topics.split(',').map(t => t.trim())
      };

      const response = await api.post('/exams/generate', payload);

      if ((response as any)?.success) {
        setGeneratedExam((response as any).data);
        setCurrentStep(2);
        setSuccess('Exam generated successfully! Review and edit as needed.');
      } else {
        const message = (response as any)?.message || (response as any)?.error || 'Failed to generate exam.';
        setError(message);
        setGeneratedExam(null);
        setCurrentStep(1);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to generate exam.';
      setError(message);
      setGeneratedExam(null);
      setCurrentStep(1);
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = { ...generatedExam };
    updated.questions[index][field] = value;
    setGeneratedExam(updated);
  };

  const publishExam = async () => {
    setLoading(true);
    setError('');

    try {
      const examData = {
        ...generatedExam,
        status: 'PUBLISHED'
      };

      const response = await api.post('/exams', examData);

      if ((response as any)?.success) {
        setSuccess('Exam published successfully!');
        setTimeout(() => navigate('/exams'), 2000);
      } else {
        const message = (response as any)?.message || (response as any)?.error || 'Failed to publish exam. Please try again.';
        setError(message);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to publish exam. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    setLoading(true);
    try {
      const examData = {
        ...generatedExam,
        status: 'DRAFT'
      };

      const response = await api.post('/exams', examData);
      if ((response as any)?.success) {
        setSuccess('Draft saved successfully!');
      } else {
        const message = (response as any)?.message || (response as any)?.error || 'Failed to save draft';
        setError(message);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to save draft';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Create Professional Exam
          </h1>
          <p className="text-gray-600">
            AI-powered exam generation with multiple question types
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'
            }`}>
              1
            </div>
            <div className={`w-24 h-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'
            }`}>
              2
            </div>
            <div className={`w-24 h-1 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              currentStep >= 3 ? 'bg-green-600 text-white' : 'bg-gray-300'
            }`}>
              ✓
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Step 1: Configure Exam */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6">Configure Your Exam</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={examInfo.title}
                    onChange={handleInfoChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Mathematics Mid-Term Exam"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={examInfo.subject}
                    onChange={handleInfoChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Mathematics, Science, English"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topics to Cover * (comma-separated)
                  </label>
                  <textarea
                    name="topics"
                    value={examInfo.topics}
                    onChange={handleInfoChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="e.g., Fractions, Decimals, Geometry, Algebra"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade Level
                    </label>
                    <select
                      name="gradeLevel"
                      value={examInfo.gradeLevel}
                      onChange={handleInfoChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>Grade {i + 1}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      name="duration"
                      value={examInfo.duration}
                      onChange={handleInfoChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                      min="15"
                      max="180"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty Mix
                  </label>
                  <select
                    name="difficulty"
                    value={examInfo.difficulty}
                    onChange={handleInfoChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EASY">Easy (Beginner Level)</option>
                    <option value="MEDIUM">Medium (Intermediate)</option>
                    <option value="HARD">Hard (Advanced)</option>
                    <option value="MIXED">Mixed (Balanced)</option>
                  </select>
                </div>
              </div>

              {/* Right Column - Question Types */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Question Types Distribution
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Total: {getTotalQuestions()} questions)
                  </span>
                </h3>

                <div className="space-y-3">
                  {questionTypes.map(qt => (
                    <div key={qt.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{qt.icon}</span>
                        <span className="font-medium">{qt.label}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => updateQuestionTypeCount(qt.type, -1)}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-semibold">{qt.count}</span>
                        <button
                          type="button"
                          onClick={() => updateQuestionTypeCount(qt.type, 1)}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>AI Generation:</strong> Our AI will create diverse, grade-appropriate questions based on your topics and preferences.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={() => navigate('/exams')}
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={generateExam}
                disabled={generating || getTotalQuestions() === 0}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg transform hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating with AI...
                  </span>
                ) : (
                  '✨ Generate Exam with AI'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Edit */}
        {currentStep === 2 && generatedExam && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Review & Edit Generated Exam</h2>
              <div className="flex space-x-2">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  DRAFT
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {generatedExam.questions?.length || 0} Questions
                </span>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Title:</span>
                  <p className="font-semibold">{generatedExam.title}</p>
                </div>
                <div>
                  <span className="text-gray-600">Subject:</span>
                  <p className="font-semibold">{generatedExam.subject}</p>
                </div>
                <div>
                  <span className="text-gray-600">Grade:</span>
                  <p className="font-semibold">Grade {generatedExam.gradeLevel}</p>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <p className="font-semibold">{generatedExam.duration} minutes</p>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {generatedExam.questions?.map((q: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                        {index + 1}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {q.type.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        q.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                        q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {q.difficulty}
                      </span>
                      <span className="text-sm text-gray-500">{q.marks} marks</span>
                    </div>
                    <button
                      onClick={() => setEditingQuestion(editingQuestion === index ? null : index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {editingQuestion === index ? 'Done' : 'Edit'}
                    </button>
                  </div>

                  {editingQuestion === index ? (
                    <div className="space-y-2">
                      <textarea
                        value={q.question}
                        onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows={2}
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
                              className="w-full px-3 py-1 border rounded"
                            />
                          ))}
                        </div>
                      )}
                      <input
                        type="text"
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                        className="w-full px-3 py-1 border rounded"
                        placeholder="Correct answer"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-800 mb-2">{q.question}</p>
                      {q.options && (
                        <div className="ml-4 space-y-1">
                          {q.options.map((opt: string, i: number) => (
                            <p key={i} className="text-sm text-gray-600">
                              {String.fromCharCode(65 + i)}. {opt}
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-green-600 mt-2">
                        Answer: {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                ← Back to Configuration
              </button>

              <div className="flex space-x-4">
                <button
                  onClick={saveDraft}
                  disabled={loading}
                  className="px-6 py-3 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Save as Draft
                </button>
                <button
                  onClick={publishExam}
                  disabled={loading}
                  className="px-8 py-3 rounded-lg bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold hover:shadow-lg transform hover:scale-105 transition"
                >
                  {loading ? 'Publishing...' : '🚀 Publish Exam'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}