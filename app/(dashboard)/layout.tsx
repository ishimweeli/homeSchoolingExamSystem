'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import Navbar from '@/components/dashboard/Navbar'
import { LoadingSidebar, LoadingDashboard } from '@/components/ui/loading-skeleton'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Show loading UI immediately while authentication loads
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <LoadingSidebar />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <div className="animate-pulse h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="animate-pulse h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow border">
                <div className="animate-pulse h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show UI immediately even if session is not loaded yet
  return (
    <div className="min-h-screen bg-gray-50">
      {session ? <Sidebar /> : <LoadingSidebar />}
      <div className="lg:ml-64">
        {session ? <Navbar /> : (
          <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
            <div className="animate-pulse h-6 bg-gray-200 rounded w-32"></div>
          </div>
        )}
        <main className="p-4 lg:p-8">
          {session ? children : (
            <div className="space-y-6">
              <div className="animate-pulse h-8 bg-gray-200 rounded w-48"></div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-lg shadow">
                    <div className="animate-pulse h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}