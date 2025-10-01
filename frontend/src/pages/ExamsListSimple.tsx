import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function ExamsListSimple() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [students, setStudents] = useState([]);
  const [assigningExam, setAssigningExam] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
    if (user?.role === 'TEACHER') {
      fetchStudents();
    }
  }, [user]);

  const fetchExams = async () => {
    try {
      const response = await api.get('/exams');
      setExams(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching exams:', err);
      setError('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      setStudents(response.data.data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const handleAssign = async (examId: string) => {
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    try {
      const response = await api.post(`/exams/${examId}/assign`, {
        studentIds: [selectedStudent]
      });

      if (response.data.success) {
        toast.success('Exam assigned successfully');
        setAssigningExam(null);
        setSelectedStudent('');
      }
    } catch (err: any) {
      toast.error('Failed to assign exam: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  const handleTakeExam = (examId: string) => {
    navigate(`/exams/take/${examId}`);
  };

  const handleViewExam = (examId: string) => {
    navigate(`/exams/${examId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading exams...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {user?.role === 'STUDENT' ? 'My Exams' : 'Exams'}
          </h1>

          {user?.role === 'TEACHER' && (
            <Link
              to="/exams/create-simple"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Create New Exam
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {exams.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              {user?.role === 'STUDENT'
                ? 'No exams assigned to you yet'
                : 'No exams created yet'}
            </p>
            {user?.role === 'TEACHER' && (
              <Link
                to="/exams/create-simple"
                className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Your First Exam
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam: any) => (
              <div key={exam.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">{exam.title}</h2>
                    <div className="text-gray-600 space-y-1">
                      <p>Subject: {exam.subject}</p>
                      <p>Grade Level: {exam.gradeLevel}</p>
                      <p>Duration: {exam.duration} minutes</p>
                      <p>Total Marks: {exam.totalMarks}</p>
                      <p>Questions: {exam._count?.questions || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {user?.role === 'STUDENT' ? (
                      <>
                        <button
                          onClick={() => handleTakeExam(exam.id)}
                          className="block w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                        >
                          Take Exam
                        </button>
                        <button
                          onClick={() => handleViewExam(exam.id)}
                          className="block w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                        >
                          View Details
                        </button>
                      </>
                    ) : user?.role === 'TEACHER' ? (
                      <>
                        <button
                          onClick={() => handleViewExam(exam.id)}
                          className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          View Exam
                        </button>

                        {assigningExam === exam.id ? (
                          <div className="space-y-2">
                            <select
                              value={selectedStudent}
                              onChange={(e) => setSelectedStudent(e.target.value)}
                              className="w-full border rounded-lg px-3 py-2"
                            >
                              <option value="">Select Student</option>
                              {students.map((student: any) => (
                                <option key={student.id} value={student.id}>
                                  {student.name || student.email}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAssign(exam.id)}
                                className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setAssigningExam(null)}
                                className="flex-1 bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssigningExam(exam.id)}
                            className="block w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                          >
                            Assign to Student
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => handleViewExam(exam.id)}
                        className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        View Exam
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}