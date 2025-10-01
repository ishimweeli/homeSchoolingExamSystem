import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function ModuleCreate() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.createStudyModule({ title, subject, topic, gradeLevel });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create module');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Create Study Module</h1>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4 bg-white p-6 rounded-xl border border-gray-200">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Title</label>
            <input className="w-full border rounded-lg px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Subject</label>
              <input className="w-full border rounded-lg px-3 py-2" value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Topic</label>
              <input className="w-full border rounded-lg px-3 py-2" value={topic} onChange={e => setTopic(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Grade</label>
              <input type="number" min={1} max={12} className="w-full border rounded-lg px-3 py-2" value={gradeLevel} onChange={e => setGradeLevel(Number(e.target.value))} />
            </div>
          </div>
          <button disabled={loading} className="px-4 py-2 rounded-lg bg-purple-600 text-white">
            {loading ? 'Creating…' : 'Create Module'}
          </button>
        </form>
      </div>
    </div>
  );
}


