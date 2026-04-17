import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Mail, ExternalLink, Sparkles, Filter, Award, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function ShortlistedPage() {
  const [shortlisted, setShortlisted] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch Jobs to get passing scores and titles
      const jobsSnapshot = await getDocs(collection(db, 'jobs'));
      const jobsMap: Record<string, any> = {};
      jobsSnapshot.docs.forEach(doc => {
        jobsMap[doc.id] = { id: doc.id, ...doc.data() };
      });
      setJobs(jobsMap);

      // Fetch Screenings to find passed candidates
      const screeningsSnapshot = await getDocs(collection(db, 'screenings'));
      
      // Fetch Applicants details
      const applicantsSnapshot = await getDocs(collection(db, 'applicants'));
      const applicantsMap: Record<string, any> = {};
      applicantsSnapshot.docs.forEach(doc => {
        applicantsMap[doc.id] = { id: doc.id, ...doc.data() };
      });

      const passedCandidates: any[] = [];
      
      // We must avoid duplicates if a candidate is screened multiple times for the same job
      // We will keep the highest score per applicant+job combo.
      const bestScores = new Map<string, any>();

      screeningsSnapshot.docs.forEach(doc => {
        const s = doc.data();
        const job = jobsMap[s.jobId];
        const passScore = job?.passingScore || 70;

        if (s.results && Array.isArray(s.results)) {
          s.results.forEach((res: any) => {
            if (res.matchScore >= passScore && res.applicantId) {
              const applicant = applicantsMap[res.applicantId];
              if (applicant) {
                const key = `${s.jobId}-${res.applicantId}`;
                const existing = bestScores.get(key);
                if (!existing || existing.matchScore < res.matchScore) {
                  bestScores.set(key, {
                    ...res,
                    applicant,
                    job,
                    screeningId: doc.id
                  });
                }
              }
            }
          });
        }
      });

      setShortlisted(Array.from(bestScores.values()).sort((a, b) => b.matchScore - a.matchScore));

    } catch (error) {
      console.error('Failed to fetch shortlisted candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredShortlisted = shortlisted.filter(cand => {
    const term = searchQuery.toLowerCase();
    const searchMatch = 
      cand.applicant.name?.toLowerCase().includes(term) ||
      cand.applicant.profileData?.headline?.toLowerCase().includes(term) ||
      cand.job.title?.toLowerCase().includes(term);

    const jobMatch = jobFilter === 'all' || cand.job.id === jobFilter;
    
    return searchMatch && jobMatch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Award className="h-10 w-10 text-amber-500" />
            Shortlisted Candidates
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Top talent who have successfully passed the AI screening phase.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search finalists by name, headline, or job title..."
            className="pl-10 h-12 border-border shadow-sm rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full md:w-72">
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl shadow-sm focus:ring-primary/20">
              <div className="flex items-center gap-2 overflow-hidden">
                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                <SelectValue placeholder="All Roles">
                  {jobFilter === 'all' ? 'All Roles' : jobs[jobFilter]?.title}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 max-h-64">
              <SelectItem value="all" className="py-3 rounded-xl">All Roles</SelectItem>
              {Object.values(jobs).map((job: any) => (
                <SelectItem key={job.id} value={job.id} className="py-3 rounded-xl">{job.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : filteredShortlisted.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="bg-amber-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="h-12 w-12 text-amber-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">No shortlisted candidates yet</h2>
          <p className="mt-2 text-slate-500 font-medium">Screen candidates on the jobs page to invite top talent here.</p>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {filteredShortlisted.map((cand) => (
            <motion.div key={`${cand.job.id}-${cand.applicantId}`} variants={item}>
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow bg-white rounded-3xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <CardHeader className="pb-4 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-2xl shadow-md border-2 border-white">
                      {cand.applicant.name?.charAt(0) || 'A'}
                    </div>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 font-black px-3 py-1 border-0">
                      <BadgeCheck className="w-4 h-4 mr-1" />
                      Score: {cand.matchScore}%
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-black text-slate-900 leading-tight">
                    {cand.applicant.name}
                  </CardTitle>
                  <CardDescription className="text-slate-500 font-medium line-clamp-1 mt-1">
                    {cand.applicant.profileData?.headline || cand.applicant.email}
                  </CardDescription>
                  
                  {cand.applicant.email && (
                    <div className="flex items-center gap-2 mt-3 text-sm font-medium text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <a href={`mailto:${cand.applicant.email}`} className="hover:text-primary transition-colors truncate">
                        {cand.applicant.email}
                      </a>
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-6 relative z-10">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Key Strengths</h4>
                    <ul className="space-y-2">
                      {cand.strengths?.slice(0, 3).map((strength: string, i: number) => (
                        <li key={i} className="flex items-start text-sm text-slate-700 font-medium">
                          <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="line-clamp-2">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Applied For</p>
                        <p className="text-sm font-bold text-slate-900 max-w-[150px] truncate">{cand.job.title}</p>
                      </div>
                      <Link to={`/admin/screening/${cand.job.id}/${cand.screeningId}`}>
                        <Button variant="outline" className="rounded-xl font-bold bg-slate-50 hover:bg-slate-100 hover:text-primary transition-colors border-0">
                          Full View
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
