import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

interface Exam {
  id: string;
  title: string;
  subject: string;
  gradeLevel: number;
  duration: number;
  totalMarks: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  _count?: {
    questions: number;
    assignments?: number;
  };
}

interface ExamAttempt {
  id: string;
  startedAt: string;
  submittedAt: string | null;
  isCompleted: boolean;
  exam: {
    id: string;
    title: string;
    subject: string;
    totalMarks: number;
  };
  grade?: {
    percentage: number;
    grade: string;
    passed: boolean;
  };
}

export default function Exams() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<any[]>([]);
  const [attemptCount, setAttemptCount] = useState(2); // Default 2 attempts
  const [myAttempts, setMyAttempts] = useState<ExamAttempt[]>([]);
  const [assignedExams, setAssignedExams] = useState<any[]>([]);
  const [loadingResultsFor, setLoadingResultsFor] = useState<string | null>(null);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
  const [showEditAttempts, setShowEditAttempts] = useState(false);
  const [studentToUnassign, setStudentToUnassign] = useState<{id: string, name: string} | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<{id: string, name: string, currentAttempts: number} | null>(null);
  const [newAttemptCount, setNewAttemptCount] = useState(2);

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      fetchAssignedExams();
      fetchMyAttempts();
    } else {
      fetchExams();
      if (user?.role === 'TEACHER') {
        fetchStudents();
      }
    }
  }, [user]);

  useEffect(() => {
    filterExams();
  }, [exams, searchTerm, selectedSubject, selectedGrade, selectedStatus]);

  const fetchExams = async () => {
    try {
      const response = await api.get('/exams');
      // api.get returns the top-level JSON, so the list is under response.data
      setExams((response as any).data || []);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      // api.get returns the response data directly, so access .data for the students array
      setStudents((response as any).data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchAssignedExams = async () => {
    try {
      const response = await api.get('/students/assigned-exams');
      setAssignedExams((response as any).data || []);
    } catch (err) {
      console.error('Error fetching assigned exams:', err);
    }
  };

  const fetchMyAttempts = async () => {
    try {
      const response = await api.get('/results');
      setMyAttempts((response as any).data || []);
    } catch (err) {
      console.error('Error fetching exam attempts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterExams = () => {
    let filtered = [...exams];

    if (searchTerm) {
      filtered = filtered.filter(exam =>
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(exam => exam.subject === selectedSubject);
    }

    if (selectedGrade !== 'all') {
      filtered = filtered.filter(exam => exam.gradeLevel === parseInt(selectedGrade));
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(exam => exam.status === selectedStatus);
    }

    setFilteredExams(filtered);
  };

  const handleAssignExam = async (exam: Exam) => {
    setSelectedExam(exam);
    setShowAssignModal(true);
    setAttemptCount(2); // Reset to default
    
    // Fetch already assigned students for this exam
    try {
      const response = await api.get(`/exams/${exam.id}/assignments`);
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
    if (!selectedExam || selectedStudents.length === 0) return;

    setAssigning(true);
    try {
      const response: any = await api.post(`/exams/${selectedExam.id}/assign`, {
        studentIds: selectedStudents,
        maxAttempts: attemptCount
      });
      
      const message = response?.data?.message || response?.message || `Exam assigned successfully!`;
      toast.success(message);
      
      setShowAssignModal(false);
      setSelectedStudents([]);
      setAssignedStudentIds([]);
      setCurrentAssignments([]);
      
      // Refresh assignments
      await handleAssignExam(selectedExam);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || 'Failed to assign exam';
      toast.error(message);
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = (studentId: string, studentName: string) => {
    setStudentToUnassign({ id: studentId, name: studentName });
    setShowUnassignConfirm(true);
  };

  const confirmUnassign = async () => {
    if (!selectedExam || !studentToUnassign) return;

    try {
      const response: any = await api.post(`/exams/${selectedExam.id}/unassign`, {
        studentId: studentToUnassign.id
      });
      
      toast.success(response?.data?.message || 'Student unassigned and attempts refunded');
      
      // Refresh assignments - keep modal open
      const exam = selectedExam;
      const refreshResponse = await api.get(`/exams/${exam.id}/assignments`);
      const assignments = (refreshResponse as any).data || [];
      setCurrentAssignments(assignments);
      const assignedIds = assignments.map((a: any) => a.studentId);
      setAssignedStudentIds(assignedIds);
      
      setShowUnassignConfirm(false);
      setStudentToUnassign(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to unassign student';
      toast.error(message);
    }
  };

  const handleEditAttempts = (studentId: string, studentName: string, currentAttempts: number) => {
    setStudentToEdit({ id: studentId, name: studentName, currentAttempts });
    setNewAttemptCount(currentAttempts);
    setShowEditAttempts(true);
  };

  const confirmEditAttempts = async () => {
    if (!selectedExam || !studentToEdit) return;
    
    if (newAttemptCount === studentToEdit.currentAttempts) {
      setShowEditAttempts(false);
      return;
    }

    if (newAttemptCount < 1 || newAttemptCount > 10) {
      toast.error('Please enter a number between 1 and 10');
      return;
    }

    try {
      // First unassign
      await api.post(`/exams/${selectedExam.id}/unassign`, {
        studentId: studentToEdit.id
      });
      
      // Then reassign with new attempts
      await api.post(`/exams/${selectedExam.id}/assign`, {
        studentIds: [studentToEdit.id],
        maxAttempts: newAttemptCount
      });
      
      toast.success(`${studentToEdit.name} reassigned with ${newAttemptCount} attempts!`);
      
      // Refresh assignments - keep modal open
      const exam = selectedExam;
      const refreshResponse = await api.get(`/exams/${exam.id}/assignments`);
      const assignments = (refreshResponse as any).data || [];
      setCurrentAssignments(assignments);
      const assignedIds = assignments.map((a: any) => a.studentId);
      setAssignedStudentIds(assignedIds);
      
      setShowEditAttempts(false);
      setStudentToEdit(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || 'Failed to reassign student';
      toast.error(message);
    }
  };

  const handlePublish = async (examId: string) => {
    setPublishing(examId);
    try {
      await api.post(`/exams/${examId}/publish`);
      fetchExams(); // Refresh list
      toast.success('Exam published successfully');
    } catch (err) {
      toast.error('Failed to publish exam');
    } finally {
      setPublishing(null);
    }
  };

  const handleTakeExam = (examId: string) => {
    navigate(`/exams/take/${examId}`);
  };

  const handleDeleteClick = (exam: Exam) => {
    setSelectedExam(exam);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedExam) return;

    setDeleting(true);
    try {
      const response: any = await api.delete(`/exams/${selectedExam.id}`);
      if (response.success) {
        toast.success('Exam deleted successfully');
        fetchExams(); // Refresh list
      } else {
        toast.error(response.message || 'Failed to delete exam');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to delete exam';
      toast.error(message);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setSelectedExam(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: string } = {
      DRAFT: 'bg-yellow-100 text-yellow-800',
      PUBLISHED: 'bg-green-100 text-green-800',
      ARCHIVED: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.DRAFT}`}>
        {status}
      </span>
    );
  };

  const uniqueSubjects = [...new Set(exams.map(e => e.subject))];
  const uniqueGrades = [...new Set(exams.map(e => e.gradeLevel))].sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600">Loading exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user?.role === 'STUDENT' ? 'My Exams' : 'Exam Management'}
              </h1>
              <p className="mt-2 text-gray-600">
                {user?.role === 'STUDENT'
                  ? 'View and take your assigned exams'
                  : 'Create, manage, and assign exams to students'}
              </p>
            </div>
            {user?.role === 'TEACHER' && (
              <Link
                to="/exams/create"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition"
              >
                + Create New Exam
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Subjects</option>
                {uniqueSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Grades</option>
                {uniqueGrades.map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>

            {user?.role === 'TEACHER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {user?.role === 'STUDENT' 
                ? `${assignedExams.length} assigned ${assignedExams.length === 1 ? 'exam' : 'exams'} • ${myAttempts.length} ${myAttempts.length === 1 ? 'attempt' : 'attempts'}`
                : `Showing ${filteredExams.length} of ${exams.length} exams`
              }
            </p>
            {user?.role !== 'STUDENT' && filteredExams.length !== exams.length && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSubject('all');
                  setSelectedGrade('all');
                  setSelectedStatus('all');
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Student View: Assigned Exams */}
        {user?.role === 'STUDENT' && (
          <>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">📚 Assigned Exams</h2>
                <p className="text-sm text-gray-600 mt-1">Exams you can take</p>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignedExams.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No exams assigned yet. Your teacher will assign exams to you.
                      </td>
                    </tr>
                  ) : (
                    assignedExams.map((assignment: any) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{assignment.exam?.title || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{assignment.exam?.subject || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Grade {assignment.exam?.gradeLevel || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{assignment.exam?.duration || 0} min</td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">
                            {assignment.attemptsUsed || 0} / {assignment.maxAttempts || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {(assignment.attemptsUsed || 0) < (assignment.maxAttempts || 0) ? (
                            <button
                              onClick={() => navigate(`/exams/take/${assignment.exam?.id}`)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                            >
                              Take Exam
                            </button>
                          ) : (
                            <span className="px-4 py-2 text-sm text-gray-400">No attempts left</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Student View: My Exam Attempts */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">📝 My Exam Results</h2>
                <p className="text-sm text-gray-600 mt-1">View your completed exam attempts</p>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No exam attempts yet. Complete an assigned exam to see your results here.
                    </td>
                  </tr>
                ) : (
                  myAttempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{attempt.exam.title}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{attempt.exam.subject}</td>
                      <td className="px-6 py-4">
                        {attempt.isCompleted ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            In Progress
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {attempt.grade ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {attempt.grade.percentage.toFixed(1)}%
                            </div>
                            <div className={`text-xs ${attempt.grade.passed ? 'text-green-600' : 'text-red-600'}`}>
                              Grade: {attempt.grade.grade}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {attempt.isCompleted ? (
                          <button
                            onClick={async () => {
                              try {
                                setLoadingResultsFor(attempt.id);
                                // Pre-load the results data before navigating
                                await api.get(`/exams/results/${attempt.id}`);
                                // Only navigate after data is loaded
                                navigate(`/exams/results/${attempt.id}`);
                              } catch (err) {
                                console.error('Failed to load results:', err);
                                toast.error('Failed to load results');
                                setLoadingResultsFor(null);
                              }
                            }}
                            disabled={loadingResultsFor === attempt.id}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 justify-center min-w-[120px]"
                          >
                            {loadingResultsFor === attempt.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Loading...
                              </>
                            ) : (
                              'View Results'
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/exams/take/${attempt.exam.id}`)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                          >
                            Continue
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Exams Table (Teacher/Admin View) */}
        {user?.role !== 'STUDENT' && (filteredExams.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg mb-4">No exams found</p>
            {user?.role === 'TEACHER' && (
              <Link
                to="/exams/create"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Your First Exam
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Questions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExams.map(exam => (
                    <tr key={exam.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{exam.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          {exam.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        Grade {exam.gradeLevel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {exam.duration} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {exam._count?.questions || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(exam.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {user?.role === 'STUDENT' ? (
                            <>
                              <button
                                onClick={() => navigate(`/exams/${exam.id}`)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleTakeExam(exam.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Take Exam"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => navigate(`/exams/${exam.id}`)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              {exam.status === 'DRAFT' && (
                                <button
                                  onClick={() => navigate(`/exams/${exam.id}/edit`)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  title="Edit"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              {exam.status === 'DRAFT' && (
                                <button
                                  onClick={() => handlePublish(exam.id)}
                                  disabled={publishing === exam.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Publish"
                                >
                                  {publishing === exam.id ? (
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </button>
                              )}
                              {exam.status !== 'DRAFT' && (
                                <>
                                  <button
                                    onClick={() => handleAssignExam(exam)}
                                    className="text-purple-600 hover:text-purple-900"
                                    title="Assign"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => navigate(`/exams/${exam.id}/student-results`)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="View Student Results"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteClick(exam)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Assign Exam</h3>
            <p className="text-gray-600 mb-4">
              Select students to assign "{selectedExam?.title}"
            </p>

            {/* Current Assignments */}
            {currentAssignments.length > 0 && (
              <div className="mb-4 bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                <h4 className="font-semibold text-purple-900 mb-2">Currently Assigned ({currentAssignments.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {currentAssignments.map((assignment: any) => (
                    <div key={assignment.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{assignment.student?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600 font-medium">
                          {assignment.maxAttempts || 0} {assignment.maxAttempts === 1 ? 'attempt' : 'attempts'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditAttempts(assignment.studentId, assignment.student?.name || 'student', assignment.maxAttempts)}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                          title="Change attempt count"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleUnassign(assignment.studentId, assignment.student?.name || 'student')}
                          className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
                          title="Unassign & refund attempts"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attempt Count Input */}
            <div className="mb-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
              <label className="block text-sm font-bold text-yellow-900 mb-2">
                Number of Attempts 🎯
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={attemptCount}
                onChange={(e) => setAttemptCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border-2 border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-500 font-semibold text-lg"
                placeholder="2"
              />
              <p className="text-xs text-yellow-700 mt-1">
                How many attempts each student gets for this exam
              </p>
            </div>

            {/* Student Selection */}
            <div className="max-h-60 overflow-y-auto border rounded-lg p-2 mb-4">
              {students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No students found</p>
                  <Link to="/students" className="text-blue-600 hover:text-blue-800 text-sm">
                    Create students first →
                  </Link>
                </div>
              ) : (
                students.map((student: any) => {
                  const isAlreadyAssigned = assignedStudentIds.includes(student.id);
                  return (
                    <label 
                      key={student.id} 
                      className={`flex items-center p-2 rounded ${
                        isAlreadyAssigned 
                          ? 'bg-gray-100 cursor-not-allowed opacity-60' 
                          : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={student.id}
                        checked={selectedStudents.includes(student.id)}
                        disabled={isAlreadyAssigned}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.username}</p>
                        {isAlreadyAssigned && (
                          <p className="text-xs text-green-600 mt-1">✓ Already assigned</p>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStudents([]);
                  setAssignedStudentIds([]);
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
                  `Assign to ${selectedStudents.length} Student(s)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedExam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-red-600">Delete Exam</h3>
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete "{selectedExam.title}"?
            </p>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete the exam and all its questions.
              {selectedExam._count && (selectedExam._count.assignments || 0) > 0 && (
                <span className="block mt-2 font-semibold text-orange-600">
                  Warning: This exam has {selectedExam._count.assignments} assignment(s). All related data will be deleted.
                </span>
              )}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedExam(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unassign Confirmation Modal */}
      {showUnassignConfirm && studentToUnassign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-red-600">Confirm Unassign</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to unassign <strong>{studentToUnassign.name}</strong>?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800">
                ⚠️ This will:
                <ul className="list-disc ml-5 mt-2">
                  <li>Delete all their exam attempts & results</li>
                  <li>Refund only <strong>unused attempts</strong> back to your pool</li>
                  <li>This action cannot be undone</li>
                </ul>
              </p>
              <p className="text-xs text-yellow-700 mt-2 italic">
                Example: Assigned 3 attempts, student used 1 → Refund 2 attempts
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUnassignConfirm(false);
                  setStudentToUnassign(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnassign}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Yes, Unassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attempts Modal */}
      {showEditAttempts && studentToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-blue-600">Edit Attempt Count</h3>
            <p className="text-gray-700 mb-4">
              Change attempts for <strong>{studentToEdit.name}</strong>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Attempts
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newAttemptCount}
                  onChange={(e) => setNewAttemptCount(parseInt(e.target.value) || 1)}
                  className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-lg"
                />
                <span className="text-gray-600">
                  (was {studentToEdit.currentAttempts})
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Enter 1-10 attempts</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800">
                ⚠️ This will delete all existing attempts and results, then reassign with new attempt count.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditAttempts(false);
                  setStudentToEdit(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmEditAttempts}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

