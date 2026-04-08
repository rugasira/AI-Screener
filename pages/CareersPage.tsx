import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Calendar, MapPin, Clock, CheckCircle2, LogOut, User, Search } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CareersPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('appliedJobs') || '[]');
    setAppliedJobIds(saved);
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      // Only show jobs that haven't expired
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M10 8.5A5 5 0 1 0 10 15.5" />
              <path d="M14 15.5A5 5 0 1 0 14 8.5" />
            </svg>
            Umurava Careers
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{user.displayName || user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                {/* Simple admin check */}
                {['alexisahishakiye378@gmail.com', 'pine06858@gmail.com'].includes(user.email || '') && (
                  <Link to="/admin" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Admin Dashboard
                  </Link>
                )}
              </>
            ) : (
              <Link to="/login" className={buttonVariants({ variant: "outline" })}>
                Admin Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Join <span className="text-primary">Umurava</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-500">
            Umurava is a leading platform connecting Africa's top talent with global opportunities. 
            We are building the future of work by empowering professionals to showcase their skills, 
            grow their careers, and work with innovative companies worldwide.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="available" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="available">Available Positions</TabsTrigger>
                <TabsTrigger value="applied">My Applications ({appliedJobs.length})</TabsTrigger>
              </TabsList>
            </div>

            <div className="mb-8 max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search jobs by title, skills, or requirements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            <TabsContent value="available" className="space-y-6">
              {availableJobs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                  <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No open positions</h3>
                  <p className="mt-1 text-sm text-gray-500">Check back later for new opportunities.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {availableJobs.map((job) => (
                    <Card key={job.id} className="hover:shadow-md transition-shadow flex flex-col">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl line-clamp-2">{job.title}</CardTitle>
                        </div>
                        <CardDescription className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center gap-4">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                              {job.type === 'internship' ? 'Internship' : job.type === 'part-time' ? 'Part-time' : 'Full-time'}
                            </span>
                            <span className="flex items-center text-xs text-gray-500">
                              <Clock className="mr-1 h-3 w-3" />
                              {job.experience}
                            </span>
                          </div>
                          {job.deadline && (
                            <div className="flex items-center text-orange-600 text-sm font-medium mt-1">
                              <Calendar className="mr-1 h-4 w-4" />
                              Deadline: {format(new Date(job.deadline), 'MMM d, yyyy')} 
                              <span className="ml-1 text-orange-500/80">
                                ({differenceInDays(new Date(job.deadline), new Date())} days left)
                              </span>
                            </div>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                          {job.requirements}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {job.skills.split(',').slice(0, 3).map((skill: string, i: number) => (
                            <span key={i} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                              {skill.trim()}
                            </span>
                          ))}
                          {job.skills.split(',').length > 3 && (
                            <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                              +{job.skills.split(',').length - 3}
                            </span>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-4 border-t">
                        <Link to={`/careers/${job.id}/apply`} className={buttonVariants({ className: "w-full" })}>
                          Apply Now
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="applied" className="space-y-6">
              {appliedJobs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No applications yet</h3>
                  <p className="mt-1 text-sm text-gray-500">You haven't applied to any positions.</p>
                  <Button variant="outline" className="mt-4" onClick={() => document.querySelector<HTMLButtonElement>('[value="available"]')?.click()}>
                    View Available Positions
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {appliedJobs.map((job) => (
                    <Card key={job.id} className="border-green-200 bg-green-50/30 flex flex-col">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl line-clamp-2">{job.title}</CardTitle>
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        </div>
                        <CardDescription className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center gap-4">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                              {job.type === 'internship' ? 'Internship' : job.type === 'part-time' ? 'Part-time' : 'Full-time'}
                            </span>
                            <span className="flex items-center text-xs text-gray-500">
                              <Clock className="mr-1 h-3 w-3" />
                              {job.experience}
                            </span>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                          {job.requirements}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-4 border-t border-green-100 flex flex-col gap-2">
                        <div className="w-full text-center text-sm font-medium text-green-700">
                          Application Submitted
                        </div>
                        <Link to={`/careers/${job.id}/apply`} className={buttonVariants({ variant: "outline", className: "w-full border-green-200 text-green-700 hover:bg-green-50" })}>
                          View Details
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
