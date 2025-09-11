'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { 
  GraduationCap, 
  FileText, 
  TrendingUp, 
  Users,
  Clock,
  Award,
  BookOpen,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role

  // Mock data - replace with actual API calls
  const stats = {
    totalExams: userRole === 'STUDENT' ? 12 : 24,
    completedExams: 8,
    averageScore: 85,
    upcomingExams: 3,
  }

  const recentActivity = [
    { id: 1, title: 'Mathematics Quiz', score: 92, date: '2024-01-20' },
    { id: 2, title: 'Science Exam', score: 88, date: '2024-01-19' },
    { id: 3, title: 'History Test', score: 79, date: '2024-01-18' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {session?.user?.name}!
        </h1>
        <p className="opacity-90">
          {userRole === 'STUDENT' 
            ? 'Ready to learn something new today?' 
            : 'Manage your exams and track student progress'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label={userRole === 'STUDENT' ? 'Available Exams' : 'Total Exams'}
          value={stats.totalExams}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={Award}
          label="Completed"
          value={stats.completedExams}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Average Score"
          value={`${stats.averageScore}%`}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          icon={Clock}
          label="Upcoming"
          value={stats.upcomingExams}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userRole === 'STUDENT' ? (
              <>
                <QuickActionCard
                  icon={GraduationCap}
                  title="Take Exam"
                  description="Start a new exam or quiz"
                  href="/exams/take"
                  color="bg-blue-500"
                />
                <QuickActionCard
                  icon={BookOpen}
                  title="Study Materials"
                  description="Access learning resources"
                  href="/materials"
                  color="bg-green-500"
                />
                <QuickActionCard
                  icon={Award}
                  title="View Results"
                  description="Check your exam scores"
                  href="/results"
                  color="bg-purple-500"
                />
                <QuickActionCard
                  icon={BarChart3}
                  title="Progress"
                  description="Track your learning journey"
                  href="/analytics"
                  color="bg-orange-500"
                />
              </>
            ) : (
              <>
                <QuickActionCard
                  icon={FileText}
                  title="Create Exam"
                  description="AI-powered exam generation"
                  href="/exams/create"
                  color="bg-blue-500"
                />
                <QuickActionCard
                  icon={Users}
                  title={userRole === 'PARENT' ? 'My Children' : 'Students'}
                  description="Manage student accounts"
                  href="/children"
                  color="bg-green-500"
                />
                <QuickActionCard
                  icon={BarChart3}
                  title="Analytics"
                  description="View performance reports"
                  href="/analytics"
                  color="bg-purple-500"
                />
                <QuickActionCard
                  icon={BookOpen}
                  title="Resources"
                  description="Manage study materials"
                  href="/materials"
                  color="bg-orange-500"
                />
              </>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{activity.score}%</p>
                  <p className="text-xs text-gray-500">Score</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/results"
            className="block mt-4 text-center text-sm text-blue-600 hover:underline"
          >
            View all activity →
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  color,
}: {
  icon: any
  title: string
  description: string
  href: string
  color: string
}) {
  return (
    <Link
      href={href}
      className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg text-white ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  )
}