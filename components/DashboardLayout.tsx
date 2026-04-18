import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, Users, Settings, LogOut, Menu, X, ExternalLink, Sparkles, LayoutDashboard, ChevronRight, Bell, Search, AlertCircle, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';

const UmuravaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 8.5A5 5 0 1 0 10 15.5" />
    <path d="M14 15.5A5 5 0 1 0 14 8.5" />
  </svg>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      // Redirect to a specific page based on context or a general search page
      // For now, let's just go to applicants and use the search query
      navigate(`/admin/applicants?search=${encodeURIComponent(globalSearch)}`);
      setGlobalSearch('');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const jobsSnapshot = await getDocs(collection(db, 'jobs'));
      const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const newNotifications: any[] = [];
      const today = new Date();

      jobs.forEach((job: any) => {
        if (job.deadline) {
          const deadlineDate = parseISO(job.deadline);
          const daysDiff = differenceInDays(deadlineDate, today);

          if (isPast(deadlineDate)) {
            newNotifications.push({
              id: `deadline-${job.id}`,
              title: 'Deadline Reached',
              message: `The deadline for "${job.title}" has passed. It's time to screen applicants.`,
              type: 'critical',
              jobId: job.id,
              date: job.deadline
            });
          } else if (daysDiff <= 2) {
            newNotifications.push({
              id: `deadline-near-${job.id}`,
              title: 'Deadline Approaching',
              message: `The deadline for "${job.title}" is in ${daysDiff} day${daysDiff === 1 ? '' : 's'}.`,
              type: 'warning',
              jobId: job.id,
              date: job.deadline
            });
          }
        }
      });

      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Job Postings', href: '/admin/jobs', icon: Briefcase },
    { name: 'Applicants', href: '/admin/applicants', icon: Users },
    { name: 'Shortlisted', href: '/admin/shortlisted', icon: Award },
  ];

  return (
    <div className="flex h-screen bg-[#f1f5f9] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar (Desktop) */}
      <aside className={cn(
        "hidden md:flex flex-col border-r border-slate-200 bg-white z-20 relative transition-all duration-300 ease-in-out shadow-sm",
        isSidebarCollapsed ? "w-24" : "w-80"
      )}>
        <div className={cn(
          "flex h-24 items-center border-b border-slate-100 transition-all duration-300",
          isSidebarCollapsed ? "justify-center px-0" : "px-8"
        )}>
          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="bg-primary p-2.5 rounded-2xl shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform duration-300 shrink-0">
              <UmuravaLogo className="h-7 w-7 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span className="font-black text-2xl tracking-tighter text-slate-900">Umurava</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary -mt-1">AI Screener</span>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Collapse Toggle Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3.5 top-28 bg-white border border-slate-200 rounded-full h-7 w-7 flex items-center justify-center shadow-md hover:bg-slate-50 transition-colors z-30"
        >
          <ChevronRight className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-300",
            !isSidebarCollapsed && "rotate-180"
          )} />
        </button>
        
        <div className={cn(
          "flex-1 overflow-y-auto py-10 space-y-10",
          isSidebarCollapsed ? "px-4" : "px-6"
        )}>
          <div className="space-y-4">
            {!isSidebarCollapsed && <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Management</h3>}
            <nav className="space-y-2">
              {navigation.map((item) => {
                const isActive = item.href === '/admin' 
                  ? location.pathname === '/admin' || location.pathname === '/admin/'
                  : location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'group relative flex items-center text-sm font-black rounded-2xl transition-all duration-300',
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20'
                        : 'text-slate-500 hover:bg-primary/5 hover:text-primary',
                      isSidebarCollapsed ? "justify-center h-14 w-14 mx-auto px-0" : "px-5 py-4"
                    )}
                  >
                    <item.icon
                      className={cn(
                        'flex-shrink-0 transition-colors',
                        isSidebarCollapsed ? "h-6 w-6 mr-0" : "mr-4 h-5 w-5",
                        isActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary'
                      )}
                    />
                    {!isSidebarCollapsed && item.name}
                    {isActive && !isSidebarCollapsed && (
                      <motion.div 
                        layoutId="active-nav-indicator"
                        className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className={cn(
          "p-8 border-t border-slate-100 bg-slate-50/50 transition-all duration-300",
          isSidebarCollapsed ? "px-4" : "p-8"
        )}>
          {user && !isSidebarCollapsed && (
            <div className="flex items-center gap-4 mb-8 px-2">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="relative h-12 w-12 rounded-2xl object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="relative h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black border-2 border-white shadow-sm">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'A'}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-slate-900 truncate leading-tight">{user.displayName || 'Admin'}</span>
                <span className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest mt-0.5">{user.email}</span>
              </div>
            </div>
          )}
          
          {user && isSidebarCollapsed && (
            <div className="flex justify-center mb-8">
               <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black border-2 border-white shadow-sm">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'A'}
               </div>
            </div>
          )}

          <Button 
            variant="ghost" 
            className={cn(
              "w-full text-slate-400 hover:text-destructive hover:bg-destructive/5 font-black rounded-2xl h-12 transition-colors",
              isSidebarCollapsed ? "justify-center px-0" : "justify-start px-5"
            )} 
            onClick={logout}
          >
            <LogOut className={cn(isSidebarCollapsed ? "h-6 w-6 mr-0" : "mr-4 h-5 w-5")} />
            {!isSidebarCollapsed && "Sign out"}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Header (Desktop & Mobile) */}
        <header className="flex h-24 items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-md px-8 z-30">
          <div className="flex items-center gap-8 flex-1">
            <div className="md:hidden flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl">
                <UmuravaLogo className="h-5 w-5 text-white" />
              </div>
              <span className="font-black text-xl tracking-tighter text-slate-900">Umurava</span>
            </div>
            
            <div className="hidden md:flex items-center relative max-w-md w-full">
              <Search className="absolute left-4 h-4 w-4 text-slate-400" />
              <form onSubmit={handleGlobalSearch} className="w-full">
                <Input 
                  placeholder="Search anything..." 
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-11 h-12 bg-slate-50 border-0 rounded-2xl focus-visible:ring-primary/20 font-medium w-full"
                />
              </form>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-2xl h-12 w-12 bg-slate-50 border border-slate-100 hover:bg-slate-100 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors">
                <Settings className="h-5 w-5 text-slate-600" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 font-bold">
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-xl py-3 cursor-pointer">Account Profile</DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl py-3 cursor-pointer">AI Configuration</DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl py-3 cursor-pointer">Billing & Subscription</DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl py-3 cursor-pointer">Organization Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-2xl h-12 w-12 bg-slate-50 border border-slate-100 hover:bg-slate-100 relative flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors">
                <Bell className="h-5 w-5 text-slate-600" />
                {notifications.length > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full border-2 border-white" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl border-0 shadow-2xl p-2">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-black text-lg px-4 py-3">Notifications</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-slate-100" />
                <div className="max-h-[400px] overflow-y-auto py-2">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 font-medium">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} className="p-4 rounded-xl cursor-pointer hover:bg-slate-50 focus:bg-slate-50 border-b border-slate-50 last:border-0">
                        <div className="flex gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            notif.type === 'critical' ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-600"
                          )}>
                            <AlertCircle className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-black text-sm text-slate-900 leading-tight">{notif.title}</span>
                            <p className="text-xs font-medium text-slate-500 leading-relaxed">{notif.message}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                              {format(parseISO(notif.date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden rounded-2xl h-12 w-12 bg-slate-50 border border-slate-100">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
              />
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 left-0 w-[320px] bg-white z-50 md:hidden flex flex-col shadow-2xl"
              >
                <div className="h-24 flex items-center px-8 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-xl">
                      <UmuravaLogo className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-black text-2xl tracking-tighter text-slate-900">Umurava</span>
                  </div>
                </div>
                <div className="flex-1 py-10 px-6 space-y-10">
                  <nav className="space-y-2">
                    {navigation.map((item) => {
                      const isActive = item.href === '/admin' 
                        ? location.pathname === '/admin' || location.pathname.startsWith('/admin/jobs')
                        : location.pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center px-5 py-4 text-base font-black rounded-2xl transition-all',
                            isActive
                              ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                              : 'text-slate-500 hover:bg-primary/5 hover:text-primary'
                          )}
                        >
                          <item.icon className={cn('mr-4 h-5 w-5', isActive ? 'text-primary' : 'text-slate-400')} />
                          {item.name}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
                <div className="p-8 border-t border-slate-100">
                  <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-destructive font-black rounded-2xl h-14" onClick={logout}>
                    <LogOut className="mr-4 h-5 w-5" />
                    Sign out
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto bg-[#f1f5f9] relative">
          <div className="p-6 sm:p-12 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


