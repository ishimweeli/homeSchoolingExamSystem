import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[] | null;
  marks: number;
  order: number;
}

interface ExamDetail {
  id: string;
  title: string;
  subject: string;
  gradeLevel: number;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  aiGenerated?: boolean;
  questions: Question[];
  creator?: { name: string; email: string };
  _count?: { attempts: number; assignments: number };
}

export default function ExamView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, fetchProfile } = useAuthStore();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!isAuthenticated) {
          await fetchProfile();
        }
        if (!id) return;
        const data = await api.getExam(id);
        setExam(data);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading exam…</div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">
          {error || 'Exam not found'}
          <button className="ml-3 text-purple-600" onClick={() => navigate(-1)}>Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-gray-600 mt-1">
              {exam.subject} • Grade {exam.gradeLevel} • {exam.duration} min
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Total {exam.totalMarks} marks • Pass {exam.passingMarks}
            </p>
          </div>
          <button onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50">Back to Dashboard</button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            <p className="text-sm text-gray-500">Questions are shown as students will see them.</p>
          </div>
          <div className="p-6 space-y-6">
            {exam.questions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-xl border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Question {idx + 1} • {q.type.replace('_', ' ')}</div>
                <div className="font-medium text-gray-900">{q.question}</div>
                {Array.isArray(q.options) && q.options.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {q.options.map((opt, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded border border-gray-300 inline-block" />
                        <span className="text-gray-700">{opt}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 text-xs text-gray-500">Marks: {q.marks}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


