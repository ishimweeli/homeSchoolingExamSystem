import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Search, Filter, Clock, Users,
  MoreVertical, Edit, Trash2, Eye, Share2, Award,
  TrendingUp, Calendar, Target, Brain, Sparkles,
  ChevronRight, Star, Play, Download, Lock, Unlock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface Module {
  id: string;
  title: string;
  subject: string;
  description: string;
  topics: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedHours: number;
  lessonsCount: number;
  studentsEnrolled: number;
  completionRate: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  lastUpdated: string;
  thumbnail?: string;
}

export default function StudyModules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await api.get('/study-modules');
      setModules(response.data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      // Use mock data for demo
      setModules(mockModules);
    } finally {
      setLoading(false);
    }
  };

  const mockModules: Module[] = [
    {
      id: '1',
      title: 'Introduction to Algebra',
      subject: 'Mathematics',
      description: 'Master the fundamentals of algebraic expressions and equations',
      topics: ['Variables', 'Linear Equations', 'Quadratic Equations', 'Functions'],
      difficulty: 'BEGINNER',
      estimatedHours: 12,
      lessonsCount: 8,
      studentsEnrolled: 45,
      completionRate: 78,
      status: 'PUBLISHED',
      createdAt: '2024-01-15',
      lastUpdated: '2024-01-20'
    },
    {
      id: '2',
      title: 'Advanced Physics Concepts',
      subject: 'Science',
      description: 'Explore complex physics theories and their applications',
      topics: ['Quantum Mechanics', 'Relativity', 'Thermodynamics', 'Electromagnetism'],
      difficulty: 'ADVANCED',
      estimatedHours: 20,
      lessonsCount: 15,
      studentsEnrolled: 23,
      completionRate: 65,
      status: 'PUBLISHED',
      createdAt: '2024-01-10',
      lastUpdated: '2024-01-18'
    },
    {
      id: '3',
      title: 'Creative Writing Workshop',
      subject: 'English',
      description: 'Develop your creative writing skills through interactive exercises',
      topics: ['Story Structure', 'Character Development', 'Dialogue', 'Editing'],
      difficulty: 'INTERMEDIATE',
      estimatedHours: 10,
      lessonsCount: 6,
      studentsEnrolled: 67,
      completionRate: 82,
      status: 'PUBLISHED',
      createdAt: '2024-01-05',
      lastUpdated: '2024-01-12'
    },
    {
      id: '4',
      title: 'World History: Ancient Civilizations',
      subject: 'History',
      description: 'Journey through the great civilizations of the ancient world',
      topics: ['Egypt', 'Greece', 'Rome', 'Mesopotamia', 'China'],
      difficulty: 'INTERMEDIATE',
      estimatedHours: 15,
      lessonsCount: 10,
      studentsEnrolled: 0,
      completionRate: 0,
      status: 'DRAFT',
      createdAt: '2024-01-25',
      lastUpdated: '2024-01-25'
    }
  ];

  const filteredModules = modules.filter(module => {
    const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDifficulty = filterDifficulty === 'all' || module.difficulty === filterDifficulty;
    const matchesStatus = filterStatus === 'all' || module.status === filterStatus;

    return matchesSearch && matchesDifficulty && matchesStatus;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'BEGINNER': return 'bg-green-100 text-green-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'PUBLISHED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BookOpen className="w-8 h-8 mr-3 text-purple-600" />
              Study Modules
            </h1>
            <p className="text-gray-600 mt-2">Create and manage interactive learning modules with AI assistance</p>
          </div>
          <button
            onClick={() => navigate('/modules/create')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Module
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Modules</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{modules.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Published</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {modules.filter(m => m.status === 'PUBLISHED').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Unlock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {modules.reduce((sum, m) => sum + m.studentsEnrolled, 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg. Completion</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {modules.length > 0
                  ? Math.round(modules.reduce((sum, m) => sum + m.completionRate, 0) / modules.length)
                  : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search modules, topics, or subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Difficulties</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>

          <button className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Modules Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No modules found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or create your first module</p>
          <button
            onClick={() => navigate('/modules/create')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
          >
            Create Your First Module
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredModules.map((module) => (
            <div key={module.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 overflow-hidden group">
              {/* Module Header with Gradient */}
              <div className="h-32 bg-gradient-to-br from-purple-500 to-indigo-600 relative p-6">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${getDifficultyColor(module.difficulty)}`}>
                      {module.difficulty}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusColor(module.status)}`}>
                      {module.status}
                    </span>
                  </div>
                  <button className="p-1 hover:bg-white/20 rounded transition-colors">
                    <MoreVertical className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="absolute bottom-4 left-6">
                  <p className="text-white/80 text-sm">{module.subject}</p>
                </div>
              </div>

              {/* Module Content */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  {module.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{module.description}</p>

                {/* Topics */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {module.topics && module.topics.slice(0, 3).map((topic, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {topic}
                    </span>
                  ))}
                  {module.topics && module.topics.length > 3 && (
                    <span className="px-2 py-1 text-gray-500 text-xs">
                      +{module.topics.length - 3} more
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">Lessons</p>
                    <p className="text-gray-900 font-semibold">{module.lessonsCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">Duration</p>
                    <p className="text-gray-900 font-semibold">{module.estimatedHours}h</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">Students</p>
                    <p className="text-gray-900 font-semibold">{module.studentsEnrolled}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                {module.studentsEnrolled > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Avg. Completion</span>
                      <span className="text-xs font-semibold text-gray-700">{module.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${module.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/modules/${module.id}`)}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </button>
                  {module.status === 'PUBLISHED' && (
                    <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center">
                      <Share2 className="w-4 h-4 mr-2" />
                      Assign
                    </button>
                  )}
                  {module.status === 'DRAFT' && (
                    <button className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Assistant Floating Button */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group">
        <Brain className="w-6 h-6" />
        <span className="absolute right-full mr-3 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          AI Assistant
        </span>
      </button>
    </div>
  );
}