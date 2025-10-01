import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Lesson Plans', href: '/lesson-plans' },
  { label: 'Subscription', href: '/subscription' },
  { label: 'Home', href: '/' },
]

const resourceItems = [
  { label: 'Resources', href: '/resources' },
  { label: 'Recent Activity', href: '/activity' },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r">
        <div className="px-5 py-4 border-b text-lg font-semibold">Mwalimu Tools</div>
        <nav className="p-3 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm ${pathname === item.href ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 mt-6 text-xs uppercase tracking-wide text-gray-500">Resources</div>
        <nav className="p-3 space-y-1">
          {resourceItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm ${pathname === item.href ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}


