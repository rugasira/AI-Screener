import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Calendar, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInDays } from 'date-fns';

export default function CareersPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          <Button variant="outline" asChild>
            <Link to="/login">Admin Login</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Join Our Team
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            Discover your next career opportunity at Umurava.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed">
            <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No open positions</h3>
            <p className="mt-1 text-sm text-gray-500">Check back later for new opportunities.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl line-clamp-2">{job.title}</CardTitle>
                  </div>
                  <CardDescription className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
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
                  <Button className="w-full" asChild>
                    <Link to={`/careers/${job.id}/apply`}>Apply Now</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
