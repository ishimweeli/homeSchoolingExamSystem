import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Users, FileText, Brain, BarChart3, Settings,
  LogOut, Menu, X, Home, CreditCard, ChevronDown, GraduationCap, RefreshCw, User, Building2
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface LayoutProps {
  children: React.ReactNode;
}

// Determine UI role based on global role and organization role
const determineUIRole = (globalRole?: string, orgRole?: string) => {
  // Global ADMIN role takes precedence
  if (globalRole === 'ADMIN') {
    return 'ADMIN';
  }
  
  // Otherwise, map organization role
  switch (orgRole) {
    case 'OWNER':
    case 'TEACHER':
      return 'TEACHER';
    case 'PARENT':
      return 'PARENT';
    case 'STUDENT':
    default:
      return 'STUDENT';
  }
};

export default function Layout({ children }: LayoutProps) {
  const {
    user: authUser,
    isAuthenticated,
    fetchProfile,
    logout,
    organizations = [],
    activeOrg,
    fetchOrganizations,
    switchOrganization
  } = useAuthStore();

  const user = authUser || null;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOrgMenu, setShowOrgMenu] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Determine UI role based on global role and active organization role
  const userRole = determineUIRole(user?.role, (activeOrg as any)?.role);

  // Ensure authenticated and load organizations
  useEffect(() => {
    const init = async () => {
      if (!isAuthenticated || !authUser) {
        try {
          await fetchProfile();
        } catch (_) {
          navigate('/login');
          return;
        }
      }
      await fetchOrganizations();
    };
    init();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (orgMenuRef.current && !orgMenuRef.current.contains(event.target as Node)) {
        setShowOrgMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOrgSwitch = (orgId: string) => {
    switchOrganization(orgId);
    setShowOrgMenu(false);
    localStorage.setItem('activeOrgId', orgId);
    window.location.reload();
  };

  const handleRefresh = () => window.location.reload();

  // Sidebar items with roles
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard', roles: ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'] },
    { id: 'exams', label: 'Exams', icon: FileText, path: '/exams', roles: ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'] },
    { id: 'modules', label: 'Study Modules', icon: BookOpen, path: '/modules', roles: ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'] },
    { id: 'students', label: 'Students', icon: Users, path: '/students', roles: ['TEACHER', 'PARENT', 'ADMIN'] },
    { id: 'invites', label: 'Invites', icon: Users, path: '/invites', roles: ['ADMIN', 'TEACHER'] },
    { id: 'subscription', label: 'Subscription', icon: CreditCard, path: '/subscription', roles: ['TEACHER', 'PARENT', 'ADMIN'] },
    { id: 'ai-tools', label: 'AI Tools', icon: Brain, path: '/ai-tools', roles: ['TEACHER', 'ADMIN'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['TEACHER', 'PARENT', 'ADMIN'] },
    { id: 'admin-tiers', label: 'Admin', icon: Settings, path: '/admin/tiers', roles: ['ADMIN'] },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', roles: ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'] },
  ];

  // Filter sidebar items by current UI role
  const filteredSidebarItems = sidebarItems.filter(item =>
    item.roles.includes(userRole)
  );

  const isActiveRoute = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

  const currentItem = sidebarItems.find(item => isActiveRoute(item.path));
  const pageTitle = currentItem?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-white shadow-xl transition-all duration-300 flex flex-col border-r border-gray-200`}>
        {/* Logo Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${!sidebarOpen && 'justify-center'}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              {sidebarOpen && (
                <div className="ml-3">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    EduSystem
                  </h1>
                  <p className="text-xs text-gray-500">Learning Platform</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
            </button>
          </div>
        </div>

        {/* Organization Switcher */}
        {organizations.length > 0 && (
          <div className={`border-b border-gray-200 ${sidebarOpen ? 'p-4' : 'p-2'}`}>
            <div className="relative" ref={orgMenuRef}>
              {sidebarOpen ? (
                <button
                  onClick={() => setShowOrgMenu(!showOrgMenu)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 rounded-lg transition-colors group border border-purple-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Organization</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {activeOrg?.name || 'Select Organization'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                </button>
              ) : (
                <button
                  onClick={() => setShowOrgMenu(!showOrgMenu)}
                  className="w-full flex items-center justify-center p-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 rounded-lg transition-colors border border-purple-200"
                  title={activeOrg?.name || 'Select Organization'}
                >
                  <Building2 className="w-5 h-5 text-purple-600" />
                </button>
              )}

              {showOrgMenu && (
                <div className={`absolute ${sidebarOpen ? 'left-0 right-0' : 'left-full ml-2'} mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden`}>
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-700">Switch Organization</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {organizations.map(org => (
                      <button
                        key={org.id}
                        onClick={() => handleOrgSwitch(org.id)}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-purple-50 transition-colors ${
                          org.id === activeOrg?.id
                            ? 'bg-purple-50 text-purple-700 font-semibold'
                            : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className={`w-4 h-4 ${org.id === activeOrg?.id ? 'text-purple-600' : 'text-gray-400'}`} />
                          <p className="truncate">{org.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {filteredSidebarItems.map(item => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.path);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-purple-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-purple-600'}`} />
                    {sidebarOpen && (
                      <span className={`ml-3 font-medium ${isActive ? 'text-white' : ''}`}>
                        {item.label}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Header Bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs text-gray-500 mb-1">Mwalimu Tools</div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
                {pageTitle}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="p-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                aria-label="refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* User Profile Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      <p className="text-xs text-purple-600 font-medium capitalize mt-1">{userRole.toLowerCase()}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings');
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
                    >
                      <User className="w-4 h-4 mr-3 text-gray-500" />
                      Profile Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center border-t border-gray-100 mt-1"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}