import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, Users, Settings, LogOut, Menu, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const UmuravaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 8.5A5 5 0 1 0 10 15.5" />
    <path d="M14 15.5A5 5 0 1 0 14 8.5" />
  </svg>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Jobs', href: '/', icon: Briefcase },
    { name: 'Applicants', href: '/applicants', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Sidebar (Desktop) */}
      <div className="hidden md:flex w-64 flex-col border-r bg-white">
        <div className="flex h-16 items-center px-6 border-b">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <UmuravaLogo className="h-6 w-6" />
            Umurava AI Screener
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
            
            <div className="pt-4 mt-4 border-t border-gray-100">
              <Link
                to="/careers"
                target="_blank"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-purple-700 hover:bg-purple-50"
              >
                <ExternalLink className="mr-3 h-5 w-5 flex-shrink-0 text-purple-500" />
                View Careers Portal
              </Link>
            </div>
          </nav>
        </div>
        <div className="p-4 border-t space-y-4">
          {user && (
            <div className="flex items-center px-2">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="h-8 w-8 rounded-full mr-2" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold mr-2">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'A'}
                </div>
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-gray-900 truncate">{user.displayName || 'Admin'}</span>
                <span className="text-xs text-gray-500 truncate">{user.email}</span>
              </div>
            </div>
          )}
          <Button variant="outline" className="w-full justify-start text-gray-600" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:hidden">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <UmuravaLogo className="h-6 w-6" />
            <span className="hidden sm:inline">Umurava AI Screener</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-6 w-6 text-gray-600" /> : <Menu className="h-6 w-6 text-gray-600" />}
            </Button>
          </div>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b bg-white">
            <nav className="space-y-1 px-4 py-3">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'group flex items-center px-3 py-2 text-base font-medium rounded-md',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0',
                        isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-2 mt-2 border-t border-gray-100">
                <Link
                  to="/careers"
                  target="_blank"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="group flex items-center px-3 py-2 text-base font-medium rounded-md text-purple-700 hover:bg-purple-50"
                >
                  <ExternalLink className="mr-3 h-5 w-5 flex-shrink-0 text-purple-500" />
                  View Careers Portal
                </Link>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-100">
                <Button variant="ghost" className="w-full justify-start text-gray-600 text-base px-3" onClick={logout}>
                  <LogOut className="mr-3 h-5 w-5" />
                  Sign out
                </Button>
              </div>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
