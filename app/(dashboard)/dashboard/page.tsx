'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { 
  GraduationCap, 
  FileText, 
  TrendingUp, 
  Users,
  Clock,
  Award,
  BookOpen,
  BarChart3,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/loading-skeleton'

export default function DashboardPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const [stats, setStats] = useState({
    totalExams: 0,
    completedExams: 0,
    averageScore: 0,
    upcomingExams: 0,
    totalStudents: 0,
    pendingGrading: 0
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setRecentActivity(data.recentActivity || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          {loading ? (
            <Skeleton className="h-8 w-64 bg-white/20" />
          ) : (
            `Welcome back, ${session?.user?.name}!`
          )}
        </h1>
        <p className="opacity-90">
          {loading ? (
            <Skeleton className="h-4 w-48 bg-white/20" />
          ) : userRole === 'STUDENT'
            ? 'Ready to learn something new today?'
            : 'Manage your exams and track student progress'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {userRole === 'STUDENT' ? (
          <>
            <StatCard
              icon={FileText}
              label="Available Exams"
              value={stats.totalExams}
              color="bg-blue-100 text-blue-600"
              loading={loading}
            />
            <StatCard
              icon={Award}
              label="Completed"
              value={stats.completedExams}
              color="bg-green-100 text-green-600"
              loading={loading}
            />
            <StatCard
              icon={TrendingUp}
              label="Average Score"
              value={`${stats.averageScore || 0}%`}
              color="bg-purple-100 text-purple-600"
              loading={loading}
            />
            <StatCard
              icon={Clock}
              label="Upcoming"
              value={stats.upcomingExams}
              color="bg-orange-100 text-orange-600"
              loading={loading}
            />
          </>
        ) : (
          <>
            <StatCard
              icon={FileText}
              label="Total Exams"
              value={stats.totalExams}
              color="bg-blue-100 text-blue-600"
              loading={loading}
            />
            <StatCard
              icon={Users}
              label={userRole === 'PARENT' ? 'Children' : 'Students'}
              value={stats.totalStudents || 0}
              color="bg-green-100 text-green-600"
              loading={loading}
            />
            <StatCard
              icon={TrendingUp}
              label="Average Score"
              value={`${stats.averageScore || 0}%`}
              color="bg-purple-100 text-purple-600"
              loading={loading}
            />
            <StatCard
              icon={Clock}
              label="Pending Grading"
              value={stats.pendingGrading || 0}
              color="bg-orange-100 text-orange-600"
              loading={loading}
            />
          </>
        )}
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
                  icon={Award}
                  title="View Results"
                  description="Check your exam scores"
                  href="/results"
                  color="bg-purple-500"
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
                  href={userRole === 'PARENT' ? '/children' : '/students'}
                  color="bg-green-500"
                />
                <QuickActionCard
                  icon={Award}
                  title="View Results"
                  description="Review exam results"
                  href="/results"
                  color="bg-purple-500"
                />
                <QuickActionCard
                  icon={Users}
                  title="Classes"
                  description="Manage class groups"
                  href="/classes"
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
            {loading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{activity.title || 'Untitled Exam'}</p>
                    <p className="text-xs text-gray-500">
                      {userRole === 'STUDENT' 
                        ? activity.subject || 'General'
                        : activity.studentName || 'Unknown Student'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {Math.round(activity.score || 0)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.grade || 'Score'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
          {recentActivity.length > 0 && (
            <Link
              href="/results"
              className="block mt-4 text-center text-sm text-blue-600 hover:underline"
            >
              View all activity →
            </Link>
          )}
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
  loading = false,
}: {
  icon: any
  label: string
  value: string | number
  color: string
  loading?: boolean
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold mt-1">{value}</p>
          )}
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
      className="block p-6 bg-gray-50 rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg text-white ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  )
}