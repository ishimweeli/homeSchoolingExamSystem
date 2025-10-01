import React, { useState, useEffect } from 'react';
import {
  BookOpen, Users, FileText, Brain, BarChart3, Settings,
  Plus, Calendar, Award, TrendingUp,
  Clock, CheckCircle, AlertCircle, Sparkles,
  BookMarked, Activity, Target, Zap, Search, Filter, ChevronRight,
  Edit, Trash2, Eye, Download, Upload, RefreshCw, ArrowUp, ArrowDown,
  PenTool, UserPlus, FolderOpen, MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

// Local type used only for role-based UI rendering
interface UserShape {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN';
  avatar?: string;
}

interface DashboardStats {
  totalExams: number;
  totalModules: number;
  totalStudents: number;
  activeAssignments: number;
  completionRate: number;
  averageScore: number;
  upcomingDeadlines: number;
  recentActivity: number;
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  questions: number;
  duration: number;
  aiGenerated?: boolean;
  assignedCount?: number;
  completedCount?: number;
}

interface StudyModule {
  id: string;
  title: string;
  subject: string;
  description: string;
  progress: number;
  lessons: number;
  duration: string;
  aiGenerated?: boolean;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  enrolledStudents?: number;
}

interface Student {
  id: string;
  name: string;
  username: string;
  grade: string;
  progress: number;
  averageScore: number;
  status: 'Active' | 'Inactive';
  lastActive: string;
  completedExams: number;
  totalExams: number;
}

interface ActivityItem {
  type: string;
  title: string;
  timestamp: string;
  status?: string;
}

const Dashboard: React.FC = () => {
  const { user: authUser, isAuthenticated, fetchProfile, logout } = useAuthStore();
  const user = (authUser as unknown as UserShape) || null;
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [modules, setModules] = useState<StudyModule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    ensureUser().then(() => fetchDashboardData());
  }, []);

  useEffect(() => {
    if (activeSection === 'exams') fetchExams();
    else if (activeSection === 'modules') fetchModules();
    else if (activeSection === 'students') fetchStudents();
  }, [activeSection]);

  const ensureUser = async () => {
    if (!isAuthenticated || !authUser) {
      try {
        await fetchProfile();
      } catch (_) {
        navigate('/login');
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, activityRes] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getRecentActivity(),
      ]);

      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value || {};
        setStats({
          totalExams: s.totalExams || 0,
          totalModules: s.totalModules || 0,
          totalStudents: s.totalStudents || 0,
          activeAssignments: s.activeAssignments || 0,
          completionRate: s.completionRate || 0,
          averageScore: s.averageScore || 0,
          upcomingDeadlines: s.upcomingDeadlines || 0,
          recentActivity: s.recentActivity || 0,
        });
      } else {
        setStats({
          totalExams: 0,
          totalModules: 0,
          totalStudents: 0,
          activeAssignments: 0,
          completionRate: 0,
          averageScore: 0,
          upcomingDeadlines: 0,
          recentActivity: 0,
        });
      }

      if (activityRes.status === 'fulfilled') {
        setActivities(activityRes.value || []);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const data = await api.listExams();
      setExams(Array.isArray(data) ? data : []);
    } catch (error) {
      setExams([]);
    }
  };

  const fetchModules = async () => {
    try {
      const data = await api.listStudyModules();
      setModules(Array.isArray(data) ? data : []);
    } catch (error) {
      setModules([]);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await api.listStudents();
      const normalized = (Array.isArray(data) ? data : []).map((s: any) => ({
        id: s.id,
        name: s.name,
        username: s.username,
        grade: s.grade || '-',
        progress: s.progress || 0,
        averageScore: s.averageScore || 0,
        status: s.status || 'Active',
        lastActive: s.lastActive || new Date(s.createdAt || Date.now()).toLocaleDateString(),
        completedExams: s.completedExams || 0,
        totalExams: s.totalExams || 0,
      }));
      setStudents(normalized);
    } catch (error) {
      setStudents([]);
    }
  };


  const handleCreateExam = async () => {
    // Navigate to exam creation or trigger AI generation
    navigate('/exams/create');
  };

  const handleCreateModule = async () => {
    // Navigate to module creation or trigger AI generation
    navigate('/modules/create');
  };


  const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; trend?: number; color: string }> =
    ({ title, value, icon: Icon, trend, color }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm font-medium ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-500'}`}>
            {trend > 0 ? <ArrowUp className="w-4 h-4" /> : trend < 0 ? <ArrowDown className="w-4 h-4" /> : null}
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h2>
          <p className="text-gray-600 mt-2">Here's your learning dashboard overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl">
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Exams"
          value={stats?.totalExams ?? 0}
          icon={FileText}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Study Modules"
          value={stats?.totalModules ?? 0}
          icon={BookOpen}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <StatCard
          title={user?.role === 'STUDENT' ? 'My Progress' : 'Total Students'}
          value={user?.role === 'STUDENT' ? `${stats?.completionRate ?? 0}%` : (stats?.totalStudents ?? 0)}
          icon={user?.role === 'STUDENT' ? Target : Users}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          title="Average Score"
          value={`${stats?.averageScore ?? 0}%`}
          icon={Award}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
            <button className="text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {activities.length === 0 && (
              <div className="text-sm text-gray-500">No recent activity yet.</div>
            )}
            {activities.map((a, idx) => (
              <div key={idx} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="space-y-3">
            {user?.role !== 'STUDENT' && (
              <>
                <button onClick={handleCreateExam} className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 flex items-center justify-between group">
                  <span className="flex items-center gap-3">
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">Create Exam</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
                <button onClick={handleCreateModule} className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-xl hover:from-green-100 hover:to-emerald-100 transition-all duration-200 flex items-center justify-between group">
                  <span className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5" />
                    <span className="font-medium">New Module</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
                <button className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-all duration-200 flex items-center justify-between group">
                  <span className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5" />
                    <span className="font-medium">Add Student</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              </>
            )}
            {user?.role === 'STUDENT' && (
              <>
                <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 flex items-center justify-between group">
                  <span className="flex items-center gap-3">
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">Take Exam</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
                <button className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-xl hover:from-green-100 hover:to-emerald-100 transition-all duration-200 flex items-center justify-between group">
                  <span className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5" />
                    <span className="font-medium">Continue Learning</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              </>
            )}
            <button className="w-full px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 rounded-xl hover:from-orange-100 hover:to-red-100 transition-all duration-200 flex items-center justify-between group">
              <span className="flex items-center gap-3">
                <Brain className="w-5 h-5" />
                <span className="font-medium">AI Tutor</span>
              </span>
              <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Performance Analytics</h3>
        </div>
        <div className="p-8 text-center text-gray-500">
          Detailed analytics charts will appear here once available.
        </div>
      </div>
    </div>
  );

  const renderExams = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Exam Management</h2>
          <p className="text-gray-600 mt-1">Create, manage and track exams</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search exams..."
              className="w-full md:w-64 pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
          {user?.role !== 'STUDENT' && (
            <>
              <button onClick={handleCreateExam} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl">
                <Plus className="w-4 h-4" />
                Create
              </button>
              <button className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl">
                <Sparkles className="w-4 h-4" />
                AI Generate
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <div key={exam.id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{exam.title}</h3>
                <p className="text-sm text-gray-600">{exam.subject} • Grade {exam.grade}</p>
              </div>
              <div className="flex items-center gap-2">
                {exam.aiGenerated && (
                  <div className="px-2 py-1 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                  </div>
                )}
                <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded-lg transition-all">
                  <MoreVertical className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                exam.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                exam.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {exam.status}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {exam.duration} min
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {exam.questions} questions
              </span>
            </div>

            <div className="flex items-center justify-between mb-4 py-3 border-y border-gray-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{exam.assignedCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Assigned</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{exam.completedCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {exam.assignedCount ? Math.round((exam.completedCount || 0) / exam.assignedCount * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Rate</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => navigate(`/exams/${exam.id}`)} className="flex-1 px-3 py-2 text-sm bg-purple-50 text-purple-700 font-medium rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-1">
                <Eye className="w-4 h-4" />
                View
              </button>
              {user?.role !== 'STUDENT' && (
                <>
                  <button className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderModules = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Study Modules</h2>
          <p className="text-gray-600 mt-1">Interactive learning modules and courses</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role !== 'STUDENT' && (
            <>
              <button onClick={handleCreateModule} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl">
                <Plus className="w-4 h-4" />
                Create Module
              </button>
              <button className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl hover:from-green-600 hover:to-teal-600 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl">
                <Brain className="w-4 h-4" />
                AI Curriculum
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {['all', 'mathematics', 'science', 'english', 'history'].map((filter) => (
          <button
            key={filter}
            onClick={() => setFilterType(filter)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterType === filter
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <div key={module.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{module.description}</p>
                </div>
                {module.aiGenerated && (
                  <div className="px-2 py-1 bg-gradient-to-r from-green-100 to-teal-100 rounded-lg ml-3">
                    <Brain className="w-4 h-4 text-green-600" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {module.lessons} lessons
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {module.duration}
                </span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  module.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                  module.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {module.difficulty}
                </span>
              </div>

              {user?.role !== 'STUDENT' && (
                <div className="flex items-center justify-between mb-4 text-sm">
                  <span className="text-gray-600">Enrolled Students</span>
                  <span className="font-semibold text-gray-900">{module.enrolledStudents || 0}</span>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-sm font-semibold text-gray-900">{module.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${module.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
                  {user?.role === 'STUDENT' ? 'Continue' : 'Manage'}
                </button>
                <button className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Student Management</h2>
          <p className="text-gray-600 mt-1">Track and manage student progress</p>
        </div>
        <button
          onClick={() => navigate('/students')}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
        >
          <UserPlus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Exams
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-500">@{student.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    Grade {student.grade}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                          style={{ width: `${student.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{student.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {student.completedExams}/{student.totalExams}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${
                      student.averageScore >= 90 ? 'text-green-600' :
                      student.averageScore >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {student.averageScore}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                      student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.lastActive}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAITools = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">AI-Powered Tools</h2>
          <p className="text-gray-600 mt-1">Enhance learning with artificial intelligence</p>
        </div>
        <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full">
          <span className="text-sm font-semibold text-purple-700">Premium Features</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            title: 'AI Exam Generator',
            description: 'Create comprehensive, curriculum-aligned exams in seconds using advanced AI',
            icon: FileText,
            color: 'from-blue-500 to-indigo-600',
            features: ['Adaptive difficulty', 'Multiple formats', 'Auto-grading'],
            action: 'Generate Exam'
          },
          {
            title: 'Smart Study Plans',
            description: 'Personalized learning paths tailored to each student\'s needs and pace',
            icon: Target,
            color: 'from-green-500 to-teal-600',
            features: ['Gap analysis', 'Progress tracking', 'Adaptive scheduling'],
            action: 'Create Plan'
          },
          {
            title: 'AI Tutor Assistant',
            description: '24/7 intelligent tutoring support with instant feedback and explanations',
            icon: Brain,
            color: 'from-purple-500 to-pink-600',
            features: ['Real-time help', 'Step-by-step solutions', 'Concept explanations'],
            action: 'Start Session'
          },
          {
            title: 'Content Generator',
            description: 'Generate engaging lessons, worksheets, and study materials instantly',
            icon: BookOpen,
            color: 'from-orange-500 to-red-600',
            features: ['Interactive content', 'Visual aids', 'Practice problems'],
            action: 'Create Content'
          },
          {
            title: 'Performance Analytics',
            description: 'Deep insights into learning patterns with predictive analytics',
            icon: TrendingUp,
            color: 'from-yellow-500 to-orange-600',
            features: ['Trend analysis', 'Predictions', 'Recommendations'],
            action: 'View Analytics'
          },
          {
            title: 'Auto Grading System',
            description: 'Intelligent exam evaluation with detailed feedback generation',
            icon: CheckCircle,
            color: 'from-indigo-500 to-purple-600',
            features: ['Instant results', 'Detailed feedback', 'Error analysis'],
            action: 'Configure'
          }
        ].map((tool, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
            <div className={`w-14 h-14 bg-gradient-to-br ${tool.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <tool.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{tool.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{tool.description}</p>

            <div className="space-y-2 mb-6">
              {tool.features.map((feature, fIdx) => (
                <div key={fIdx} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button className={`w-full px-4 py-3 bg-gradient-to-r ${tool.color} text-white rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold`}>
              <Sparkles className="w-5 h-5" />
              {tool.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-purple-600" />
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'exams':
        return renderExams();
      case 'modules':
        return renderModules();
      case 'students':
        return renderStudents();
      case 'ai-tools':
        return renderAITools();
      case 'analytics':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Advanced analytics features coming soon...</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Settings configuration coming soon...</p>
            </div>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <div className="p-8">
      {renderContent()}
    </div>
  );
};

export default Dashboard;