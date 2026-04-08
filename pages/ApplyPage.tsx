import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle2, Briefcase } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [education, setEducation] = useState('');
  const [reason, setReason] = useState('');
  const [otherInfo, setOtherInfo] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isGooglePickerLoading, setIsGooglePickerLoading] = useState(false);

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

  // Auth state
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

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
      const appliedJobs = JSON.parse(localStorage.getItem('appliedJobs') || '[]');
      if (appliedJobs.includes(jobId)) {
        setSubmitted(true);
      }
    }
  }, [jobId, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      toast.error('Please enter both email and password');
      return;
    }
    
    setIsAuthenticating(true);
    try {
      if (isLoginMode) {
        await signInWithEmail(authEmail, authPassword);
      } else {
        await signUpWithEmail(authEmail, authPassword);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Simulate a small delay for "uploading to browser" feel
      setIsUploadingFile(true);
      setUploadProgress(0);
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setResume(file);
          setIsUploadingFile(false);
          toast.success('File attached successfully');
        }
      }, 50);
    }
  };

  const handleGoogleDriveUpload = async () => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
      toast.error('Google Drive integration requires configuration. Please set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in settings.');
      return;
    }

    setIsGooglePickerLoading(true);
    
    try {
      // @ts-ignore
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response: any) => {
          if (response.error !== undefined) {
            throw response;
          }
          await createPicker(response.access_token);
        },
      });

      // @ts-ignore
      if (window.gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        tokenClient.requestAccessToken({ prompt: '' });
      }
    } catch (error) {
      console.error('Google Auth error:', error);
      toast.error('Failed to connect to Google Drive');
      setIsGooglePickerLoading(false);
    }
  };

  const createPicker = async (accessToken: string) => {
    // @ts-ignore
    await window.gapi.load('picker', {
      callback: () => {
        // @ts-ignore
        const picker = new window.google.picker.PickerBuilder()
          .addView(new window.google.picker.DocsView().setMimeTypes('application/pdf'))
          .setOAuthToken(accessToken)
          .setDeveloperKey(GOOGLE_API_KEY)
          .setCallback(async (data: any) => {
            // @ts-ignore
            if (data.action === window.google.picker.Action.PICKED) {
              const file = data.docs[0];
              await downloadGoogleDriveFile(file.id, accessToken, file.name);
            }
            // @ts-ignore
            if (data.action === window.google.picker.Action.CANCEL) {
              setIsGooglePickerLoading(false);
            }
          })
          .build();
        picker.setVisible(true);
      }
    });
  };

  const downloadGoogleDriveFile = async (fileId: string, accessToken: string, fileName: string) => {
    setIsUploadingFile(true);
    setUploadProgress(0);
    
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error('Failed to download file from Google Drive');

      const blob = await response.blob();
      const file = new File([blob], fileName, { type: 'application/pdf' });
      
      setResume(file);
      toast.success('File imported from Google Drive');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to import file from Google Drive');
    } finally {
      setIsUploadingFile(false);
      setIsGooglePickerLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !resume || !jobId) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('education', education);
    formData.append('reason', reason);
    formData.append('otherInfo', otherInfo);
    formData.append('jobId', jobId);
    formData.append('resume', resume);

    try {
      console.log('Submitting application to /api/applicants/apply...');
      const res = await fetch('/api/applicants/apply', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', res.status);

      if (res.ok) {
        // Save to localStorage
        const appliedJobs = JSON.parse(localStorage.getItem('appliedJobs') || '[]');
        if (!appliedJobs.includes(jobId)) {
          appliedJobs.push(jobId);
          localStorage.setItem('appliedJobs', JSON.stringify(appliedJobs));
        }
        
        setSubmitted(true);
        toast.success('Application submitted successfully!');
      } else {
        const data = await res.json().catch(() => ({ error: 'Unknown server error' }));
        const errorMsg = data.error || 'Failed to submit application';
        setSubmitError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error('Detailed submission error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        error: error
      });
      setSubmitError(`An error occurred: ${error.message || 'Unknown error'}. Please try again.`);
      toast.error(`An error occurred: ${error.message || 'Unknown error'}. Please try again.`);
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/careers" className={buttonVariants({ variant: "ghost", className: "mb-6 -ml-4 text-gray-500 hover:text-gray-900" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Careers
        </Link>

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

        {submitted ? (
          <Card className="text-center p-6 border-green-200 bg-green-50/30">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <CardTitle className="text-2xl mb-2 text-green-800">Application Received!</CardTitle>
            <CardDescription className="text-base mb-6 text-green-700">
              You have successfully applied to the {job.title} position. Our team will review your application and get back to you soon.
            </CardDescription>
          </Card>
        ) : !user ? (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {isLoginMode ? 'Sign in to Apply' : 'Create an Account to Apply'}
              </CardTitle>
              <CardDescription>
                You need an account to submit your application and track its status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="authEmail">Email</Label>
                  <Input 
                    id="authEmail" 
                    type="email" 
                    placeholder="applicant@example.com" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authPassword">Password</Label>
                  <Input 
                    id="authPassword" 
                    type="password" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isAuthenticating}>
                  {isAuthenticating ? 'Please wait...' : (isLoginMode ? 'Sign in with Email' : 'Sign up with Email')}
                </Button>
              </form>
              
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button onClick={signInWithGoogle} variant="outline" className="w-full" size="lg">
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Google
              </Button>
              
              <div className="mt-6 text-center text-sm">
                <button 
                  type="button"
                  onClick={() => setIsLoginMode(!isLoginMode)}
                  className="font-medium text-primary hover:text-primary/80"
                >
                  {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Submit Your Application</CardTitle>
              <CardDescription>Please provide your details and upload your resume (PDF).</CardDescription>
            </CardHeader>
            <CardContent>
              {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {submitError}
                </div>
              )}
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
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telephone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+250 788 123 456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="education">Level of Education</Label>
                    <Input
                      id="education"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      placeholder="Bachelor's Degree in Computer Science"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Why do you want to join Umurava Careers?</Label>
                  <textarea
                    id="reason"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Tell us why you are interested in this role and our company..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherInfo">Any other useful info</Label>
                  <textarea
                    id="otherInfo"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={otherInfo}
                    onChange={(e) => setOtherInfo(e.target.value)}
                    placeholder="Links to portfolio, GitHub, LinkedIn, or any other details you want to share..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="resume">Resume (PDF)</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGoogleDriveUpload}
                      disabled={isGooglePickerLoading || isUploadingFile}
                      className="text-xs h-8"
                    >
                      {isGooglePickerLoading ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>
                      ) : (
                        <svg className="mr-2 h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.5,2L6.5,12.2L3.3,18h12.7l3.2-5.8L12.5,2z M10,12.2l2.5-4.3l2.5,4.3H10z M18.5,18.5l-3.2-5.8h6.5l3.2,5.8H18.5z M6.5,18.5l-3.2-5.8h6.5l3.2,5.8H6.5z"/>
                        </svg>
                      )}
                      Google Drive
                    </Button>
                  </div>
                  
                  <div 
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-all cursor-pointer ${
                      resume ? 'border-green-500 bg-green-50/30' : 'border-gray-300 hover:border-primary'
                    }`} 
                    onClick={() => !isUploadingFile && document.getElementById('resume')?.click()}
                  >
                    <div className="space-y-1 text-center">
                      {isUploadingFile ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-2"></div>
                          <p className="text-sm font-medium text-gray-600">Uploading to browser... {uploadProgress}%</p>
                          <div className="w-48 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300" 
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : resume ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                          <p className="text-sm font-medium text-green-700">{resume.name}</p>
                          <p className="text-xs text-green-600">File ready for submission</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-2 text-xs text-gray-500 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              setResume(null);
                            }}
                          >
                            Remove and change
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600 justify-center">
                            <label
                              htmlFor="resume"
                              className="relative cursor-pointer bg-transparent rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none"
                            >
                              <span>Upload a file</span>
                              <input
                                id="resume"
                                name="resume"
                                type="file"
                                accept=".pdf"
                                className="sr-only"
                                onChange={handleFileChange}
                                required
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PDF up to 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Application Error</h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{submitError}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
