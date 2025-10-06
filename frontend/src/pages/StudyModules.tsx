import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

interface Module {
  id: string;
  title: string;
  subject: string;
  topic: string;
  description?: string;
  gradeLevel: number;
  difficulty: string;
  totalLessons: number;
  passingScore: number;
  status?: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  createdBy?: string;
  _count?: {
    assignments: number;
    lessons: number;
  };
}

interface ModuleAssignment {
  id: string;
  moduleId: string;
  studentId: string;
  currentLesson: number;
  overallProgress: number;
  status: string;
  createdAt: string;
  module: Module;
}

export default function StudyModules() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<any[]>([]);
  
  const [assignedModules, setAssignedModules] = useState<ModuleAssignment[]>([]);
  const [filteredModules, setFilteredModules] = useState<Module[]>([]);

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      fetchAssignedModules();
    } else {
    fetchModules();
      if (user?.role === 'TEACHER' || user?.role === 'PARENT') {
        fetchStudents();
      }
    }
  }, [user]);

  useEffect(() => {
    filterModules();
  }, [modules, searchTerm, selectedSubject, selectedGrade, selectedDifficulty]);

  const fetchModules = async () => {
    try {
      const response = await api.get('/study-modules');
      setModules((response as any).data || []);
    } catch (err) {
      console.error('Error fetching modules:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      setStudents((response as any).data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchAssignedModules = async () => {
    try {
      const response = await api.get('/study-modules/assignments');
      setAssignedModules((response as any).data || []);
    } catch (err) {
      console.error('Error fetching assigned modules:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterModules = () => {
    let filtered = [...modules];

    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.topic.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(m => m.subject === selectedSubject);
    }

    if (selectedGrade !== 'all') {
      filtered = filtered.filter(m => m.gradeLevel.toString() === selectedGrade);
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(m => m.difficulty === selectedDifficulty);
    }

    setFilteredModules(filtered);
  };

  const handleAssignModule = async (module: Module) => {
    setSelectedModule(module);
    setShowAssignModal(true);

    try {
      const response = await api.get(`/study-modules/${module.id}/assignments`);
      const assignments = (response as any).data || [];
      setCurrentAssignments(assignments);
      const assignedIds = assignments.map((a: any) => a.studentId);
      setAssignedStudentIds(assignedIds);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setAssignedStudentIds([]);
      setCurrentAssignments([]);
    }
  };

  const confirmAssignment = async () => {
    if (!selectedModule || selectedStudents.length === 0) return;

    setAssigning(true);
    try {
      const response: any = await api.post(`/study-modules/${selectedModule.id}/assign`, {
        studentIds: selectedStudents,
      });

      const message = response?.message || 'Module assigned successfully';
      toast.success(message);

      setShowAssignModal(false);
      setSelectedStudents([]);
      setAssignedStudentIds([]);
      setCurrentAssignments([]);

      await fetchModules();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to assign module';
      toast.error(message);
    } finally {
      setAssigning(false);
    }
  };

  const handlePublish = async (moduleId: string) => {
    setPublishing(moduleId);
    try {
      await api.post(`/study-modules/${moduleId}/publish`);
      fetchModules();
      toast.success('Module published successfully');
    } catch (err) {
      toast.error('Failed to publish module');
    } finally {
      setPublishing(null);
    }
  };

  const handleDeleteClick = (module: Module) => {
    setSelectedModule(module);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedModule) return;

    setDeleting(true);
    try {
      await api.delete(`/study-modules/${selectedModule.id}`);
      toast.success('Module deleted successfully');
      fetchModules();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete module');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setSelectedModule(null);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    const colors: any = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800',
    };
    return colors[difficulty.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
  return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
    );
  }

  // Student View
  if (user?.role === 'STUDENT') {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">📚 My Study Modules</h1>
          <p className="text-gray-600 mt-2">Interactive learning modules assigned to you</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Assigned Modules</h2>
            </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignedModules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No modules assigned yet
                  </td>
                </tr>
              ) : (
                assignedModules.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{assignment.module.title}</div>
                      <div className="text-sm text-gray-500">{assignment.module.topic}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{assignment.module.subject}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyBadge(assignment.module.difficulty)}`}>
                        {assignment.module.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${assignment.overallProgress}%` }}
                          ></div>
            </div>
                        <span className="text-sm text-gray-600">{assignment.overallProgress}%</span>
          </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${assignment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/modules/${assignment.moduleId}/take`)}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                      >
                        {assignment.status === 'COMPLETED' ? 'Review' : assignment.overallProgress > 0 ? 'Continue' : 'Start'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
            </div>
          </div>
    );
  }

  // Teacher/Parent View
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
            <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 Study Modules</h1>
          <p className="text-gray-600 mt-2">Create and manage interactive learning modules</p>
            </div>
        <button
          onClick={() => navigate('/modules/create')}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg"
        >
          ✨ Create Module
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <input
                type="text"
              placeholder="Search modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Subjects</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="English">English</option>
            <option value="History">History</option>
          </select>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Grades</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Modules Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lessons</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredModules.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No modules found. Create your first module to get started!
                </td>
              </tr>
            ) : (
              filteredModules.map((module) => (
                <tr key={module.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{module.title}</div>
                    <div className="text-sm text-gray-500">{module.topic}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{module.subject}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">Grade {module.gradeLevel}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyBadge(module.difficulty)}`}>
                      {module.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{module.totalLessons}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{module._count?.assignments || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(module.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/modules/${module.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {(module.status !== 'DRAFT' || !module.status) && (
                        <>
                          <button
                            onClick={() => navigate(`/modules/${module.id}/student-progress`)}
                            className="text-green-600 hover:text-green-900"
                            title="View Student Progress"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleAssignModule(module)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Assign"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteClick(module)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                  </button>
                </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
                </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Assign Module</h3>
            <p className="text-gray-600 mb-4">
              Select students to assign "{selectedModule?.title}"
            </p>

            {currentAssignments.length > 0 && (
              <div className="mb-4 bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                <h4 className="font-semibold text-purple-900 mb-2">Currently Assigned ({currentAssignments.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {currentAssignments.map((assignment: any) => (
                    <div key={assignment.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                      <span className="text-sm">{assignment.student?.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-500">{assignment.overallProgress}% complete</span>
                    </div>
                  ))}
                    </div>
                  </div>
                )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Students
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto">
                {students.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No students available</p>
                ) : (
                  students.map((student: any) => {
                    const isAlreadyAssigned = assignedStudentIds.includes(student.id);
                    return (
                      <label
                        key={student.id}
                        className={`flex items-center p-2 rounded hover:bg-gray-50 ${isAlreadyAssigned ? 'opacity-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents([...selectedStudents, student.id]);
                            } else {
                              setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                            }
                          }}
                          disabled={isAlreadyAssigned}
                          className="mr-2"
                        />
                        <span className="text-sm">{student.name}</span>
                        {isAlreadyAssigned && (
                          <span className="ml-auto text-xs text-purple-600">Already Assigned</span>
                        )}
                      </label>
                    );
                  })
                  )}
                </div>
              </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStudents([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAssignment}
                disabled={selectedStudents.length === 0 || assigning}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Assigning...
                  </span>
                ) : (
                  `Assign to ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
            </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Delete Module</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{selectedModule?.title}"? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
      </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
