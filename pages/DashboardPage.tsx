import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Users, 
  Briefcase, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplicants: 0,
    screenedApplicants: 0,
    passedApplicants: 0,
  });
  
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [topCandidates, setTopCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // For charts
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch Jobs
        const jobsSnapshot = await getDocs(query(collection(db, 'jobs'), orderBy('createdAt', 'desc')));
        const allJobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        const jobsList = allJobs.filter(j => j.status !== 'draft');
        
        // Fetch Applicants
        const applicantsSnapshot = await getDocs(query(collection(db, 'applicants'), orderBy('createdAt', 'desc')));
        const applicantsList = applicantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch Screenings
        const screeningsSnapshot = await getDocs(collection(db, 'screenings'));
        const screeningsList = screeningsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Extract unique top candidates from screenings
        const allScreenedCandidates: any[] = [];
        const seenCandidateIds = new Set();

        screeningsList.forEach((s: any) => {
          if (s.results && Array.isArray(s.results)) {
            s.results.forEach((res: any) => {
              if (res.matchScore > 85) {
                const applicant = applicantsList.find(a => a.id === res.applicantId);
                // Ensure we only show each applicant once in the top list
                if (applicant && !seenCandidateIds.has(res.applicantId)) {
                  seenCandidateIds.add(res.applicantId);
                  allScreenedCandidates.push({
                    ...applicant,
                    matchScore: res.matchScore,
                    jobTitle: jobsList.find(j => j.id === s.jobId)?.title || 'Unknown Job'
                  });
                }
              }
            });
          }
        });

        // Sort by match score and take top 5
        const sortedTop = allScreenedCandidates
          .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
          .slice(0, 5);
        
        setTopCandidates(sortedTop);

        let screenedCount = 0;
        let passedCount = 0;

        screeningsList.forEach((s: any) => {
          if (s.results && Array.isArray(s.results)) {
            screenedCount += s.results.length;
            
            // Find passing score for the job, default to 70
            const job = jobsList.find(j => j.id === s.jobId);
            const passScore = job?.passingScore || 70;
            
            s.results.forEach((res: any) => {
              if (res.matchScore >= passScore) {
                passedCount++;
              }
            });
          }
        });

        setStats({
          totalJobs: jobsList.length,
          totalApplicants: applicantsList.length,
          screenedApplicants: screenedCount,
          passedApplicants: passedCount,
        });

        setRecentJobs(jobsList.slice(0, 5));

        // Generate rough trend data based on applicants createdAt
        const datesMap = new Map<string, number>();
        
        // Populate last 7 days with 0
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          datesMap.set(format(d, 'MMM dd'), 0);
        }

        applicantsList.forEach((app: any) => {
          if (app.createdAt) {
            try {
              const dt = parseISO(app.createdAt);
              const fmt = format(dt, 'MMM dd');
              if (datesMap.has(fmt)) {
                datesMap.set(fmt, (datesMap.get(fmt) || 0) + 1);
              }
            } catch (e) {
              // Ignore invalid dates
            }
          }
        });

        const newTrendData = Array.from(datesMap.entries()).map(([name, Applicants]) => ({ name, Applicants }));
        setTrendData(newTrendData);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const COLORS = ['#0f172a', '#4F7CAC', '#10b981', '#f59e0b'];

  const pieData = [
    { name: 'Passed', value: stats.passedApplicants },
    { name: 'Failed', value: Math.max(0, stats.screenedApplicants - stats.passedApplicants) },
    { name: 'Unscreened', value: Math.max(0, stats.totalApplicants - stats.screenedApplicants) },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <h3 className="text-xl font-bold text-slate-500 animate-pulse">Loading Dashboard...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500 mt-2 font-medium">Here's what's happening with your recruitment process.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/jobs">
            <Button className="bg-primary hover:bg-primary/90 shadow-none h-11 px-6 rounded-none font-bold">
              Manage Postings
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-none border shadow-none relative overflow-hidden bg-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary rounded-full blur-3xl -mr-10 -mt-10 opacity-70" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="bg-secondary p-3 rounded-none text-primary">
                <Briefcase className="h-6 w-6" />
              </div>
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total</span>
            </div>
            <div className="mt-6">
              <h3 className="text-4xl font-black text-slate-900">{stats.totalJobs}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Active Job Postings</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border shadow-none relative overflow-hidden bg-slate-900 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="bg-white/10 p-3 rounded-none text-primary-foreground">
                <Users className="h-6 w-6" />
              </div>
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total</span>
            </div>
            <div className="mt-6">
              <h3 className="text-4xl font-black text-white">{stats.totalApplicants}</h3>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Total Applicants</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border shadow-none relative overflow-hidden bg-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-70" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="bg-emerald-100/50 p-3 rounded-none text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Screened</span>
            </div>
            <div className="mt-6">
              <h3 className="text-4xl font-black text-slate-900">{stats.screenedApplicants}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Screened Candidates</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border shadow-none relative overflow-hidden bg-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-70" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="bg-amber-100/50 p-3 rounded-none text-amber-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Shortlisted</span>
            </div>
            <div className="mt-6">
              <h3 className="text-4xl font-black text-slate-900">{stats.passedApplicants}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Interview Invites</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-none border shadow-none bg-white">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Application Volume
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">
              Last 7 Days (Mocked fallback if dateless)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="Applicants" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border shadow-none bg-white">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-black">Screening Status</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">
              Applicant Pipeline Breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 flex flex-col items-center justify-center">
            {stats.totalApplicants === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-slate-400 font-medium">
                No applicant data yet
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                      itemStyle={{ color: '#0f172a' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value) => <span className="text-sm font-bold text-slate-600 tracking-wide">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card className="rounded-none border shadow-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div>
              <CardTitle className="text-xl font-black">Recent Jobs</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">
                Latest created postings
              </CardDescription>
            </div>
            <Link to="/admin/jobs" className="text-sm font-bold text-primary hover:text-primary/80 flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {recentJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium">
                  No jobs posted yet
                </div>
              ) : (
                recentJobs.map(job => (
                  <div key={job.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">{job.title}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">{job.type} • {job.location}</p>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const isExpired = job.deadline ? new Date(job.deadline) < new Date() : false;
                        const status = job.status || 'open';
                        const displayStatus = (status === 'closed' || isExpired) ? 'Closed' : 'Active';
                        const statusColor = displayStatus === 'Active' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500';
                        
                        return (
                          <span className={cn("text-xs font-black px-3 py-1 rounded-none uppercase tracking-wider", statusColor)}>
                            {displayStatus}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Screened Candidates */}
        <Card className="rounded-none border shadow-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div>
              <CardTitle className="text-xl font-black">Top Candidates</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">
                Highest match scores detected
              </CardDescription>
            </div>
            <Link to="/admin/applicants" className="text-sm font-bold text-primary hover:text-primary/80 flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {topCandidates.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium">
                  Perform a screening to see top candidates
                </div>
              ) : (
                topCandidates.map((applicant, idx) => {
                  return (
                    <div key={`${applicant.id}-${idx}`} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-none bg-slate-100 flex items-center justify-center font-black text-slate-600">
                          {applicant.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{applicant.name || 'Unknown Candidate'}</h4>
                          <p className="text-xs font-medium text-slate-500 mt-0.5 truncate max-w-[200px]">
                            {applicant.jobTitle}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-wider",
                          applicant.matchScore >= 85 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {applicant.matchScore}% Match
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
