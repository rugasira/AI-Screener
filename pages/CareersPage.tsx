import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Calendar, MapPin, Clock, CheckCircle2, LogOut, User, Search, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function CareersPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchJobs();
    if (user?.email) {
      fetchAppliedJobs(user.email);
    }
  }, [user]);

  const fetchAppliedJobs = async (email: string) => {
    try {
      const q = query(collection(db, 'applicants'), where('email', '==', email));
      const snapshot = await getDocs(q);
      const jobIds = snapshot.docs.map(doc => doc.data().jobId);
      setAppliedJobIds(jobIds);
    } catch (error) {
      console.error('Failed to fetch applied jobs', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'jobs'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeJobs = data.filter((job: any) => {
        if (!job.deadline) return true;
        return differenceInDays(new Date(job.deadline), new Date()) >= 0;
      });
      setJobs(activeJobs);
    } catch (error) {
      console.error('Failed to fetch jobs', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.requirements.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.skills.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableJobs = filteredJobs.filter(job => !appliedJobIds.includes(job.id));
  const appliedJobs = filteredJobs.filter(job => appliedJobIds.includes(job.id));

  return (
    <div className="min-h-screen bg-[#f8fafc] text-foreground font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M10 8.5A5 5 0 1 0 10 15.5" />
                <path d="M14 15.5A5 5 0 1 0 14 8.5" />
              </svg>
            </div>
            <span className="font-black text-2xl tracking-tighter text-slate-900">Umurava <span className="text-primary">Careers</span></span>
          </Link>
          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-black text-slate-900 leading-none mb-1">{user.displayName || user.email?.split('@')[0]}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Talent Profile</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="ghost" className="p-0 h-10 w-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                      <User className="h-5 w-5 text-slate-600" />
                    </Button>
                  } />
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                    {['alexisahishakiye378@gmail.com', 'pine06858@gmail.com', 'admin@umurava.africa'].includes(user.email || '') && (
                      <DropdownMenuItem className="rounded-xl font-bold py-3" render={
                        <Link to="/admin" className="flex items-center">
                          <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                          Admin Dashboard
                        </Link>
                      } />
                    )}
                    <DropdownMenuItem onClick={logout} className="rounded-xl font-bold py-3 text-destructive focus:text-destructive focus:bg-destructive/5">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Link to="/login" className={buttonVariants({ variant: "default", className: "rounded-xl font-black px-6 h-11 shadow-lg shadow-primary/20" })}>
                Admin Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="bg-[#0a142f] text-white py-24 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px]"></div>
            <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-8 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-white/80">Africa's Premier Talent Marketplace</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
                Hire Africa's Vetted <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Digital Talents</span>
              </h1>
              <p className="text-xl max-w-3xl mx-auto text-white/60 mb-12 font-medium leading-relaxed">
                Join thousands of companies outsourcing to Africa's top digital professionals. 
                Vetted, ready, and specialized in high-growth careers.
              </p>
              
              <div className="max-w-2xl mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center">
                  <Search className="absolute left-5 h-6 w-6 text-slate-400" />
                  <Input 
                    type="text" 
                    placeholder="Search for your next career move..." 
                    className="pl-14 h-16 bg-white text-slate-900 border-0 rounded-2xl shadow-2xl text-lg font-medium focus-visible:ring-2 focus-visible:ring-primary"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-slate-400 font-bold animate-pulse">Loading opportunities...</p>
            </div>
          ) : (
            <Tabs defaultValue="available" className="w-full">
              <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Open Opportunities</h2>
                <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-14 border border-slate-200">
                  <TabsTrigger value="available" className="rounded-xl px-8 font-black text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Available Positions
                  </TabsTrigger>
                  <TabsTrigger value="applied" className="rounded-xl px-8 font-black text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    My Applications ({appliedJobs.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="available">
                <AnimatePresence mode="wait">
                  {availableJobs.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200"
                    >
                      <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Briefcase className="h-10 w-10 text-slate-300" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900">No positions found</h3>
                      <p className="mt-2 text-slate-500 font-medium">Try adjusting your search or check back later.</p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      variants={container}
                      initial="hidden"
                      animate="show"
                      className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
                    >
                      {availableJobs.map((job) => (
                        <motion.div key={job.id} variants={item}>
                          <Card className="group h-full flex flex-col bg-white border-slate-200 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
                            <CardHeader className="pb-4">
                              <div className="flex justify-between items-start mb-4">
                                <div className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-primary/10">
                                  {job.type}
                                </div>
                                {job.deadline && (
                                  <div className="flex items-center text-orange-500 text-[10px] font-black uppercase tracking-widest">
                                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                                    {differenceInDays(new Date(job.deadline), new Date())} Days Left
                                  </div>
                                )}
                              </div>
                              <CardTitle className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight">
                                {job.title}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-4 mt-3 font-bold text-slate-400">
                                <span className="flex items-center">
                                  <MapPin className="mr-1.5 h-3.5 w-3.5" />
                                  Remote
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                                  {job.experience}
                                </span>
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 pt-0">
                              <p className="text-slate-500 font-medium text-sm line-clamp-3 mb-6 leading-relaxed">
                                {job.requirements}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {job.skills.split(',').slice(0, 3).map((skill: string, i: number) => (
                                  <span key={i} className="bg-slate-50 text-slate-600 text-[10px] font-black px-3 py-1.5 rounded-lg border border-slate-100 uppercase tracking-wider">
                                    {skill.trim()}
                                  </span>
                                ))}
                                {job.skills.split(',').length > 3 && (
                                  <span className="text-slate-300 text-[10px] font-black px-2 py-1.5">
                                    +{job.skills.split(',').length - 3} More
                                  </span>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter className="pt-6 border-t border-slate-50 px-8 pb-8">
                              <div className="w-full text-center py-3 bg-slate-50 rounded-xl text-slate-400 font-black text-sm border border-slate-100">
                                Internal Role
                              </div>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="applied">
                <AnimatePresence mode="wait">
                  {appliedJobs.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200"
                    >
                      <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-10 w-10 text-green-400" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900">No applications yet</h3>
                      <p className="mt-2 text-slate-500 font-medium">Your submitted applications will appear here.</p>
                      <Button 
                        variant="outline" 
                        className="mt-8 rounded-xl font-black border-slate-200" 
                        onClick={() => document.querySelector<HTMLButtonElement>('[value="available"]')?.click()}
                      >
                        Browse Positions
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      variants={container}
                      initial="hidden"
                      animate="show"
                      className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
                    >
                      {appliedJobs.map((job) => (
                        <motion.div key={job.id} variants={item}>
                          <Card className="h-full flex flex-col bg-white border-green-100 rounded-[2rem] overflow-hidden shadow-xl shadow-green-500/5">
                            <CardHeader>
                              <div className="flex justify-between items-start mb-4">
                                <div className="bg-green-50 text-green-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-green-100 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Submitted
                                </div>
                                <div className="text-slate-300 text-[10px] font-black uppercase tracking-widest">
                                  {job.type}
                                </div>
                              </div>
                              <CardTitle className="text-2xl font-black text-slate-900 leading-tight">
                                {job.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 pt-0">
                              <p className="text-slate-500 font-medium text-sm line-clamp-3 leading-relaxed">
                                {job.requirements}
                              </p>
                            </CardContent>
                            <CardFooter className="pt-6 border-t border-slate-50 px-8 pb-8">
                              <div className="w-full text-center py-3 bg-green-50 rounded-xl text-green-600 font-black text-sm border border-green-100">
                                Application Logged
                              </div>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-slate-900 p-1.5 rounded-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M10 8.5A5 5 0 1 0 10 15.5" />
                <path d="M14 15.5A5 5 0 1 0 14 8.5" />
              </svg>
            </div>
            <span className="font-black text-lg tracking-tighter text-slate-900">Umurava</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            &copy; {new Date().getFullYear()} Umurava Talent Marketplace. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-400 hover:text-primary transition-colors text-sm font-bold">Privacy Policy</a>
            <a href="#" className="text-slate-400 hover:text-primary transition-colors text-sm font-bold">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

