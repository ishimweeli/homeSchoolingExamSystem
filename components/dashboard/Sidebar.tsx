'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  Users,
  Settings,
  Shield,
  Menu,
  X,
  BookOpen,
  BarChart,
  Clock,
  Award,
  PlusCircle,
  FolderOpen,
  MessageSquare,
  TrendingUp,
  Sparkles,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: string[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Create Exam',
    href: '/exams/create',
    icon: PlusCircle,
    roles: ['PARENT', 'TEACHER', 'ADMIN'],
  },
  {
    label: 'My Exams',
    href: '/exams',
    icon: FileText,
    roles: ['PARENT', 'TEACHER', 'ADMIN'],
  },
  {
    label: 'Take Exam',
    href: '/exams/take',
    icon: GraduationCap,
    roles: ['STUDENT'],
  },
  {
    label: 'Results',
    href: '/results',
    icon: Award,
  },
  {
    label: 'Study Modules',
    href: '/study',
    icon: Sparkles,
  },
  {
    label: 'Student Progress',
    href: '/study/progress',
    icon: TrendingUp,
    roles: ['TEACHER', 'PARENT', 'ADMIN'],
  },
  {
    label: 'Classes',
    href: '/classes',
    icon: Users,
    roles: ['PARENT', 'TEACHER', 'ADMIN'],
  },
  {
    label: 'Students',
    href: '/students',
    icon: Users,
    roles: ['PARENT', 'TEACHER', 'ADMIN'],
  },
  {
    label: 'Children',
    href: '/children',
    icon: Users,
    roles: ['PARENT'],
  },
  // Hidden for now - will be added back later
  // {
  //   label: 'Portfolio',
  //   href: '/portfolios',
  //   icon: FolderOpen,
  // },
  // {
  //   label: 'Community',
  //   href: '/community',
  //   icon: MessageSquare,
  // },
  // {
  //   label: 'Analytics',
  //   href: '/analytics',
  //   icon: BarChart,
  //   roles: ['PARENT', 'TEACHER', 'ADMIN'],
  // },
  // {
  //   label: 'Progress Reports',
  //   href: '/reports',
  //   icon: TrendingUp,
  //   roles: ['PARENT', 'TEACHER', 'ADMIN'],
  // },
  // {
  //   label: 'Study Materials',
  //   href: '/materials',
  //   icon: BookOpen,
  // },
  // {
  //   label: 'Admin Panel',
  //   href: '/admin',
  //   icon: Shield,
  //   roles: ['ADMIN'],
  // },
  // {
  //   label: 'Settings',
  //   href: '/settings',
  //   icon: Settings,
  // },
]

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  const userRole = session?.user?.role

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole || '')
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transition-transform',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-6 border-b">
            <div className="bg-blue-100 p-2 rounded-lg">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="font-bold text-lg">AI Homeschool</h1>
              <p className="text-xs text-gray-500">Exam System</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User info */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">
                  {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {userRole?.toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}