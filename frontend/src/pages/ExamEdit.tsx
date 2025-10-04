import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

interface Question {
  id?: string;
  type: string;
  question: string;
  options?: any;
  correctAnswer: any;
  marks: number;
  explanation?: string;
  sampleAnswer?: string;
}

interface ExamData {
  id: string;
  title: string;
  subject: string;
  gradeLevel: number;
  duration: number;
  questions: Question[];
}

export default function ExamEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [examData, setExamData] = useState<ExamData | null>(null);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        if (!id) return;
        const data = await api.getExam(id);
        // Parse JSON fields
        if (data.questions) {
          data.questions = data.questions.map((q: any) => ({
            ...q,
            options: q.options && typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
            correctAnswer: q.correctAnswer && typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer,
          }));
        }
        setExamData(data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  const handleSave = async () => {
    if (!examData) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        title: examData.title,
        subject: examData.subject,
        gradeLevel: examData.gradeLevel,
        duration: examData.duration,
        questions: examData.questions.map((q) => ({
          type: q.type,
          question: q.question,
          options: q.options || null,
          correctAnswer: q.correctAnswer,
          marks: q.marks,
          explanation: q.explanation || null,
          sampleAnswer: q.sampleAnswer || null,
        })),
      };

      const response = await api.put(`/exams/${id}`, payload);
      if ((response as any)?.success) {
        setSuccess('Exam updated successfully!');
        setTimeout(() => navigate('/exams'), 2000);
      } else {
        setError((response as any)?.message || 'Failed to update exam');
      }
    } catch (err: any) {
      console.error('Update exam error:', err);
      setError(err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to update exam');
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    if (!examData) return;
    const updated = [...examData.questions];
    updated[index] = { ...updated[index], [field]: value };
    setExamData({ ...examData, questions: updated });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    if (!examData) return;
    const updated = [...examData.questions];
    const options = Array.isArray(updated[qIndex].options) ? [...updated[qIndex].options] : [];
    options[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options };
    setExamData({ ...examData, questions: updated });
  };

  const addOption = (qIndex: number) => {
    if (!examData) return;
    const updated = [...examData.questions];
    const options = Array.isArray(updated[qIndex].options) ? [...updated[qIndex].options] : [];
    options.push('');
    updated[qIndex] = { ...updated[qIndex], options };
    setExamData({ ...examData, questions: updated });
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    if (!examData) return;
    const updated = [...examData.questions];
    const options = Array.isArray(updated[qIndex].options) ? [...updated[qIndex].options] : [];
    options.splice(optIndex, 1);
    updated[qIndex] = { ...updated[qIndex], options };
    setExamData({ ...examData, questions: updated });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading exam...</div>
      </div>
    );
  }

  if (error && !examData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Exam not found</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Edit Exam</h1>
          <button
            onClick={() => navigate('/exams')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {success}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Exam Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                value={examData.title}
                onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
              <input
                type="text"
                value={examData.subject}
                onChange={(e) => setExamData({ ...examData, subject: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
              <input
                type="number"
                value={examData.gradeLevel}
                onChange={(e) => setExamData({ ...examData, gradeLevel: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (min)</label>
              <input
                type="number"
                value={examData.duration}
                onChange={(e) => setExamData({ ...examData, duration: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Questions</h2>
          <div className="space-y-6">
            {examData.questions.map((q, qIndex) => (
              <div key={qIndex} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div className="text-sm font-medium text-gray-700">
                    Question {qIndex + 1} • {q.type.replace('_', ' ')}
                  </div>
                  <div className="text-sm text-gray-600">{q.marks} marks</div>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
                  <textarea
                    value={q.question}
                    onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                {Array.isArray(q.options) && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={typeof opt === 'string' ? opt : JSON.stringify(opt)}
                          onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => removeOption(qIndex, optIndex)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(qIndex)}
                      className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                  <textarea
                    value={typeof q.correctAnswer === 'string' ? q.correctAnswer : JSON.stringify(q.correctAnswer, null, 2)}
                    onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => navigate('/exams')}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

