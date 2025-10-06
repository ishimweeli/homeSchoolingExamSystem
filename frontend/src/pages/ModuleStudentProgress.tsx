import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'sonner';

interface StudentProgress {
  studentId: string;
  studentName: string;
  studentEmail: string;
  assignedAt: string;
  currentLesson: number;
  currentStep: number;
  overallProgress: number;
  totalXp: number;
  lives: number;
  status: string;
  lastActiveAt: string | null;
}

interface ModuleStats {
  totalAssigned: number;
  completionRate: number;
  averageProgress: number;
  studentsInProgress: number;
  studentsCompleted: number;
  averageXp: number;
}

export default function ModuleStudentProgress() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [module, setModule] = useState<any>(null);
  const [stats, setStats] = useState<ModuleStats | null>(null);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModuleProgress();
  }, [id]);

  const fetchModuleProgress = async () => {
    try {
      const response = await api.get(`/study-modules/${id}/student-progress`);
      const data = response.data?.data || response.data;
      
      setModule(data.module);
      setStats(data.statistics);
      setStudentProgress(data.studentProgress || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to fetch student progress');
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/modules')}
            className="flex items-center text-purple-600 hover:text-purple-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Modules
          </button>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{module.title}</h1>
            <p className="text-gray-600 mb-4">{module.description}</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-500">Subject:</span>
                <span className="ml-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  {module.subject}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500">Total Lessons:</span>
                <span className="ml-2 text-sm font-semibold">{module.totalLessons}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500">Difficulty:</span>
                <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {module.difficulty}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Assigned</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalAssigned}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completionRate}%</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Progress</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.averageProgress}%</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average XP</p>
                  <p className="text-3xl font-bold text-yellow-600">{Math.round(stats.averageXp)}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <span className="text-2xl">⭐</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student Progress Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Student Progress</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">XP Earned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lives</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentProgress.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No students assigned yet
                    </td>
                  </tr>
                ) : (
                  studentProgress.map((student) => (
                    <tr key={student.studentId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                          <div className="text-sm text-gray-500">{student.studentEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${student.overallProgress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">{student.overallProgress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Lesson {student.currentLesson}, Step {student.currentStep}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center text-sm font-medium text-yellow-600">
                          <span className="mr-1">⭐</span>
                          {student.totalXp} XP
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center text-sm font-medium text-red-600">
                          <span className="mr-1">❤️</span>
                          {student.lives}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          student.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : student.overallProgress > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {student.status === 'COMPLETED' ? 'Completed' : student.overallProgress > 0 ? 'In Progress' : 'Not Started'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.lastActiveAt ? new Date(student.lastActiveAt).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

