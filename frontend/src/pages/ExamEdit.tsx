import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
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
        setLoading(true);
        if (!id) return;
        const data = await api.getExam(id);
        if (data.questions) {
          data.questions = data.questions.map((q: any) => {
            const parsedOptions = typeof q.options === 'string' && (q.options.trim().startsWith('{') || q.options.trim().startsWith('[')) ? JSON.parse(q.options) : q.options;
            const parsedAnswer = typeof q.correctAnswer === 'string' && (q.correctAnswer.trim().startsWith('{') || q.correctAnswer.trim().startsWith('[')) ? JSON.parse(q.correctAnswer) : q.correctAnswer;
            return { ...q, options: parsedOptions, correctAnswer: parsedAnswer };
          });
        }
        setExamData(data);
      } catch (err: any) {
        console.error(err);
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

  const addMatchingPair = (qIndex: number) => {
    if (!examData) return;
    const updated = [...examData.questions];
    const opts = Array.isArray(updated[qIndex].options) ? [...updated[qIndex].options] : [];
    opts.push({ left: '', right: '' });
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setExamData({ ...examData, questions: updated });
  };

  const removeMatchingPair = (qIndex: number, optIndex: number) => {
    if (!examData) return;
    const updated = [...examData.questions];
    const opts = [...(updated[qIndex].options || [])];
    opts.splice(optIndex, 1);
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setExamData({ ...examData, questions: updated });
  };

  const removeAnswerPair = (qIndex: number, ansIndex: number) => {
    if (!examData) return;
    const updated = [...examData.questions];
    const answers = [...(updated[qIndex].correctAnswer || [])];
    answers.splice(ansIndex, 1);
    updated[qIndex] = { ...updated[qIndex], correctAnswer: answers };
    setExamData({ ...examData, questions: updated });
  };

  const removeQuestion = (qIndex: number) => {
    if (!examData) return;
    const updated = [...examData.questions];
    updated.splice(qIndex, 1);
    setExamData({ ...examData, questions: updated });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading exam...</div>;
  if (error && !examData) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  if (!examData) return <div className="min-h-screen flex items-center justify-center">Exam not found</div>;

  const DeleteButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="ml-2 flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition shadow-sm border border-red-200"
    >
      <X size={14} />
    </button>
  );

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Edit Exam</h1>
          <button onClick={() => navigate('/exams')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">{error}</div>}
        {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">{success}</div>}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Questions</h2>
          <div className="space-y-6">
            {examData.questions.map((q, qIndex) => (
              <div key={qIndex} className="p-4 border border-gray-200 rounded-lg relative">
                <div className="absolute top-3 right-3">
                  <DeleteButton onClick={() => removeQuestion(qIndex)} />
                </div>

                <div className="flex flex-col gap-4 mb-3">
                  <div className="text-sm font-mediu  m text-gray-700"><span className='font-bold'>Question {qIndex + 1}</span> • {q.type.replace('_', ' ')}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <label className="text-gray-700 font-bold">Marks:</label>
                    <input
                      type="number"
                      value={q.marks}
                      onChange={(e) => handleQuestionChange(qIndex, 'marks', parseInt(e.target.value))}
                      className="w-20 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
                <textarea value={q.question} onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4" rows={3} />

                {q.type.toLowerCase() === 'matching' && Array.isArray(q.options) ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                    <div className="grid grid-cols-2 gap-6 mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-2">Column A</h4>
                        {q.options.map((pair: any, optIndex: number) => (
                          <div key={`A-${optIndex}`} className="flex gap-2 mb-2 items-center">
                            <input type="text" value={pair.left || ''} onChange={(e) => {
                              const updated = [...(q.options || [])];
                              updated[optIndex] = { ...(updated[optIndex] || {}), left: e.target.value };
                              handleQuestionChange(qIndex, 'options', updated);
                            }} placeholder={`Item ${optIndex + 1}`} className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-2">Column B</h4>
                        {q.options.map((pair: any, optIndex: number) => (
                          <div key={`B-${optIndex}`} className="flex gap-2 mb-2 items-center">
                            <input type="text" value={pair.right || ''} onChange={(e) => {
                              const updated = [...(q.options || [])];
                              updated[optIndex] = { ...(updated[optIndex] || {}), right: e.target.value };
                              handleQuestionChange(qIndex, 'options', updated);
                            }} placeholder={`Match ${optIndex + 1}`} className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                            <DeleteButton onClick={() => removeMatchingPair(qIndex, optIndex)} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => addMatchingPair(qIndex)} className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">+ Add Option</button>

                    {/* Correct Answer */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Column A</h4>
                          {Array.isArray(q.correctAnswer) && q.correctAnswer.map((ans: any, ansIndex: number) => (
                            <input key={`CA-${ansIndex}`} type="text" value={ans.split(' - ')[0] || ''} onChange={(e) => {
                              const updated = [...q.correctAnswer];
                              const parts = updated[ansIndex].split(' - ');
                              updated[ansIndex] = `${e.target.value} - ${parts[1] || ''}`;
                              handleQuestionChange(qIndex, 'correctAnswer', updated);
                            }} placeholder={`Item ${ansIndex + 1}`} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-2" />
                          ))}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Column B</h4>
                          {Array.isArray(q.correctAnswer) && q.correctAnswer.map((ans: any, ansIndex: number) => (
                            <div key={`CB-${ansIndex}`} className="flex gap-2 mb-2 items-center">
                              <input type="text" value={ans.split(' - ')[1] || ''} onChange={(e) => {
                                const updated = [...q.correctAnswer];
                                const parts = updated[ansIndex].split(' - ');
                                updated[ansIndex] = `${parts[0] || ''} - ${e.target.value}`;
                                handleQuestionChange(qIndex, 'correctAnswer', updated);
                              }} placeholder={`Match ${ansIndex + 1}`} className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                              <DeleteButton onClick={() => removeAnswerPair(qIndex, ansIndex)} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => {
                        const updated = [...(q.correctAnswer || [])];
                        updated.push(' - ');
                        handleQuestionChange(qIndex, 'correctAnswer', updated);
                      }} className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">+ Add Answer</button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={handleSave} disabled={saving} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
          <button onClick={() => navigate('/exams')} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}