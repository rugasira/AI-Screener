import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [resume, setResume] = useState<File | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data);
        } else {
          toast.error('Job not found');
          navigate('/careers');
        }
      } catch (error) {
        toast.error('Failed to fetch job details');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJob();
    }
  }, [jobId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !resume || !jobId) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('jobId', jobId);
    formData.append('resume', resume);

    try {
      const res = await fetch('/api/applicants/apply', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSubmitted(true);
        toast.success('Application submitted successfully!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      toast.error('An error occurred while submitting');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!job) return null;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-2xl mb-2">Application Received!</CardTitle>
          <CardDescription className="text-base mb-6">
            Thank you for applying to the {job.title} position. Our team will review your application and get back to you soon.
          </CardDescription>
          <Button asChild className="w-full">
            <Link to="/careers">View More Jobs</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-6 -ml-4 text-gray-500 hover:text-gray-900">
          <Link to="/careers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Careers
          </Link>
        </Button>

        <div className="bg-white shadow sm:rounded-lg overflow-hidden mb-8">
          <div className="px-4 py-5 sm:px-6 border-b">
            <h3 className="text-2xl leading-6 font-bold text-gray-900">{job.title}</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {job.type === 'internship' ? 'Internship' : job.type === 'part-time' ? 'Part-time' : 'Full-time'} • {job.experience}
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Requirements</h4>
            <p className="text-gray-700 whitespace-pre-wrap mb-6">{job.requirements}</p>
            
            <h4 className="text-lg font-medium text-gray-900 mb-2">Required Skills</h4>
            <div className="flex flex-wrap gap-2">
              {job.skills.split(',').map((skill: string, i: number) => (
                <span key={i} className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  {skill.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submit Your Application</CardTitle>
            <CardDescription>Please provide your details and upload your resume (PDF).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume">Resume (PDF)</Label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors cursor-pointer" onClick={() => document.getElementById('resume')?.click()}>
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label
                        htmlFor="resume"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                      >
                        <span>{resume ? resume.name : 'Upload a file'}</span>
                        <input
                          id="resume"
                          name="resume"
                          type="file"
                          accept=".pdf"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setResume(e.target.files[0]);
                            }
                          }}
                          required
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PDF up to 10MB</p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
