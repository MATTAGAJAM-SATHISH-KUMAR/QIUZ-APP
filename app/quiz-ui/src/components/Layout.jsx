import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, BookOpen, Trophy, Users, BarChart3,
  Brain, Radio, LogOut, Menu, X, Database
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isAdmin = user?.role === 'Admin' || user?.role === 'Instructor';

  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/quizzes', icon: BookOpen, label: 'Quizzes' },
    { to: '/results', icon: Trophy, label: 'My Results' },
  ];

  const adminItems = [
    { to: '/admin/quizzes', icon: BookOpen, label: 'Manage Quizzes' },
    { to: '/admin/question-bank', icon: Database, label: 'Question Bank' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/ai-tools', icon: Brain, label: 'AI Tools' },
  ];

  if (user?.role === 'Admin') {
    adminItems.push({ to: '/admin/users', icon: Users, label: 'Users' });
  }

  const NavItem = ({ item }) => (
    <NavLink
      to={item.to}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <item.icon size={18} aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform lg:relative lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-700">Quiz App</h1>
          <button
            className="lg:hidden p-1"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(item => <NavItem key={item.to} item={item} />)}

          {isAdmin && (
            <>
              <div className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</p>
              </div>
              {adminItems.map(item => <NavItem key={item.to} item={item} />)}
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut size={16} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 lg:px-8">
          <button
            className="lg:hidden p-2 -ml-2 mr-4"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <span className="text-sm text-gray-500">{user?.email}</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
