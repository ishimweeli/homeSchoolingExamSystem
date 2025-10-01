import React, { useState } from 'react';
import {
  BarChart3, TrendingUp, Users, Award, Clock, Target,
  Calendar, Activity, BookOpen, FileText, ChevronUp,
  ChevronDown, Info, Download, Filter, RefreshCw,
  Eye, Star, AlertCircle, CheckCircle
} from 'lucide-react';

interface PerformanceData {
  subject: string;
  average: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

interface StudentProgress {
  name: string;
  avatar?: string;
  completionRate: number;
  averageScore: number;
  lastActive: string;
  trend: 'improving' | 'declining' | 'stable';
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('performance');

  // Mock data
  const performanceData: PerformanceData[] = [
    { subject: 'Mathematics', average: 85, trend: 'up', change: 5 },
    { subject: 'Science', average: 78, trend: 'down', change: -3 },
    { subject: 'English', average: 92, trend: 'up', change: 8 },
    { subject: 'History', average: 80, trend: 'stable', change: 0 },
    { subject: 'Geography', average: 75, trend: 'up', change: 2 }
  ];

  const topStudents: StudentProgress[] = [
    { name: 'Emma Wilson', completionRate: 95, averageScore: 92, lastActive: '2 hours ago', trend: 'improving' },
    { name: 'Liam Chen', completionRate: 88, averageScore: 87, lastActive: '1 day ago', trend: 'stable' },
    { name: 'Sophia Martinez', completionRate: 92, averageScore: 85, lastActive: '3 hours ago', trend: 'improving' },
    { name: 'Noah Johnson', completionRate: 78, averageScore: 79, lastActive: '2 days ago', trend: 'declining' },
    { name: 'Olivia Brown', completionRate: 85, averageScore: 83, lastActive: '5 hours ago', trend: 'stable' }
  ];

  const getTrendIcon = (trend: string) => {
    if (trend === 'up' || trend === 'improving') {
      return <ChevronUp className="w-4 h-4 text-green-500" />;
    } else if (trend === 'down' || trend === 'declining') {
      return <ChevronDown className="w-4 h-4 text-red-500" />;
    }
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 90) return 'from-green-400 to-green-600';
    if (score >= 80) return 'from-blue-400 to-blue-600';
    if (score >= 70) return 'from-yellow-400 to-yellow-600';
    return 'from-red-400 to-red-600';
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-purple-600" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Track performance, identify trends, and make data-driven decisions</p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">Last Year</option>
            </select>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm text-green-600 font-semibold flex items-center">
              <ChevronUp className="w-4 h-4" />
              12%
            </span>
          </div>
          <p className="text-gray-500 text-sm">Total Students</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">156</p>
          <p className="text-xs text-gray-400 mt-2">+18 from last month</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-semibold flex items-center">
              <ChevronUp className="w-4 h-4" />
              8%
            </span>
          </div>
          <p className="text-gray-500 text-sm">Avg. Score</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">84.2%</p>
          <p className="text-xs text-gray-400 mt-2">Above target by 4.2%</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-red-600 font-semibold flex items-center">
              <ChevronDown className="w-4 h-4" />
              5%
            </span>
          </div>
          <p className="text-gray-500 text-sm">Completion Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">76.5%</p>
          <p className="text-xs text-gray-400 mt-2">119 of 156 active</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm text-green-600 font-semibold flex items-center">
              <ChevronUp className="w-4 h-4" />
              15%
            </span>
          </div>
          <p className="text-gray-500 text-sm">Avg. Study Time</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">2.4h</p>
          <p className="text-xs text-gray-400 mt-2">Per student per day</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Performance by Subject */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Performance by Subject</h2>
            <button className="text-sm text-purple-600 hover:text-purple-700">View Details</button>
          </div>
          <div className="space-y-4">
            {performanceData.map((subject) => (
              <div key={subject.subject}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{subject.subject}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${getScoreColor(subject.average)}`}>
                      {subject.average}%
                    </span>
                    {getTrendIcon(subject.trend)}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${getProgressBarColor(subject.average)} transition-all duration-300`}
                    style={{ width: `${subject.average}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Weekly Activity</h2>
            <button className="text-sm text-purple-600 hover:text-purple-700">View All</button>
          </div>
          <div className="space-y-3">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const activity = Math.random() * 100;
              return (
                <div key={day} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-10">{day}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                        style={{ width: `${activity}%` }}
                      >
                        {activity > 20 && (
                          <span className="text-xs text-white font-medium">{Math.round(activity)}%</span>
                        )}
                      </div>
                    </div>
                    {activity < 20 && (
                      <span className="text-xs text-gray-500 font-medium">{Math.round(activity)}%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-500" />
              Top Performing Students
            </h2>
            <button className="text-sm text-purple-600 hover:text-purple-700">View All Students</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topStudents.map((student, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-semibold">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        {index === 0 && (
                          <div className="flex items-center mt-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-xs text-gray-500 ml-1">Top Performer</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-20 mr-2">
                        <div
                          className="bg-gradient-to-r from-purple-400 to-indigo-500 h-2 rounded-full"
                          style={{ width: `${student.completionRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{student.completionRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${getScoreColor(student.averageScore)}`}>
                      {student.averageScore}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.lastActive}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTrendIcon(student.trend)}
                      <span className="ml-2 text-sm text-gray-600 capitalize">{student.trend}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-purple-600 hover:text-purple-900 text-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights Panel */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-start">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-purple-600" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Insights</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Mathematics performance improved by 5% - students are responding well to the new adaptive learning modules.
              </p>
              <p className="text-sm text-gray-600 flex items-start">
                <AlertCircle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                Science completion rates are declining - consider breaking down complex topics into smaller lessons.
              </p>
              <p className="text-sm text-gray-600 flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Student engagement peaks between 3-5 PM - schedule important assessments during this window.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}