import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { GoogleGenAI } from '@google/genai';

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [screenings, setScreenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);

  useEffect(() => {
    fetchJobDetails();
    fetchApplicants();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      const [jobRes, screeningsRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch(`/api/screenings/${id}`)
      ]);
      const jobs = await jobRes.json();
      const jobData = jobs.find((j: any) => j.id === id);
      setJob(jobData);
      
      const screeningsData = await screeningsRes.json();
      // Sort screenings by newest first
      screeningsData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setScreenings(screeningsData);
    } catch (error) {
      toast.error('Failed to fetch job details');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async () => {
    try {
      const res = await fetch('/api/applicants');
      const data = await res.json();
      setApplicants(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleScreen = async () => {
    if (selectedApplicants.length === 0) {
      toast.error('Please select at least one applicant to screen');
      return;
    }

    setScreeningLoading(true);
    try {
      const applicantsToScreen = applicants.filter(a => selectedApplicants.includes(a.id));
      
      const prompt = `
        You are an expert AI recruiter. Evaluate the following candidates against the job description.
        
        Job Details:
        Title: ${job.title}
        Requirements: ${job.requirements}
        Skills: ${job.skills}
        Experience: ${job.experience}
        Passing Score: ${job.passingScore || 70} / 100

        Candidates:
        ${JSON.stringify(applicantsToScreen.map(a => ({ id: a.id, name: a.name, email: a.email, profile: a.profileData })), null, 2)}

        Analyze all applicants against the job criteria. Score and rank them.
        For each candidate, if their matchScore is >= ${job.passingScore || 70}, they pass and should receive an interview invitation email.
        If their matchScore is < ${job.passingScore || 70}, they fail and should receive a polite rejection email.
        Generate the appropriate email draft for each candidate. The email draft MUST include the candidate's email address (e.g., "To: [candidate email]") at the top.

        Return a JSON array of the shortlisted candidates (Top 10 or 20) in the following format:
        [
          {
            "applicantId": "string",
            "rank": "number",
            "matchScore": "number (0-100)",
            "strengths": ["string"],
            "gaps": ["string"],
            "finalRecommendation": "string",
            "emailDraft": "string (The generated email body)"
          }
        ]
        Only return the JSON array, no markdown formatting or other text.
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const resultText = response.text;
      if (!resultText) throw new Error("No response from Gemini");
      
      const screeningResults = JSON.parse(resultText);

      const res = await fetch('/api/screenings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id, results: screeningResults, applicantIds: selectedApplicants }),
      });
      
      if (res.ok) {
        const savedScreening = await res.json();
        toast.success('Screening completed successfully');
        navigate(`/screening/${id}/${savedScreening.id}`);
      } else {
        toast.error('Screening failed to save');
      }
    } catch (error) {
      console.error(error);
      toast.error('Screening failed');
    } finally {
      setScreeningLoading(false);
    }
  };

  const toggleApplicantSelection = (applicantId: string) => {
    setSelectedApplicants(prev => 
      prev.includes(applicantId) 
        ? prev.filter(id => id !== applicantId)
        : [...prev, applicantId]
    );
  };

  const selectAllApplicants = () => {
    if (selectedApplicants.length === applicants.length) {
      setSelectedApplicants([]);
    } else {
      setSelectedApplicants(applicants.map(a => a.id));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!job) {
    return <div>Job not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button nativeButton={false} variant="ghost" size="icon" render={<Link to="/" />}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{job.title}</h1>
            <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 uppercase tracking-wider">
              {job.type === 'internship' ? 'Internship' : 'Full-time Job'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Created on {format(new Date(job.createdAt), 'MMMM d, yyyy')}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Requirements</h3>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{job.requirements}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Skills</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.skills.split(',').map((skill: string, i: number) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Experience Level</h3>
                <p className="mt-1 text-sm text-gray-900">{job.experience}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Select Applicants to Screen</CardTitle>
                <CardDescription>Choose candidates from your pool to evaluate against this job.</CardDescription>
              </div>
              <Button onClick={handleScreen} disabled={screeningLoading || selectedApplicants.length === 0}>
                {screeningLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Screening...
                  </div>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run AI Screening
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedApplicants.length === applicants.length && applicants.length > 0}
                          onChange={selectAllApplicants}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                          No applicants available. Go to Applicants to upload some.
                        </TableCell>
                      </TableRow>
                    ) : (
                      applicants.map((applicant) => (
                        <TableRow key={applicant.id} className="cursor-pointer" onClick={() => toggleApplicantSelection(applicant.id)}>
                          <TableCell>
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                              checked={selectedApplicants.includes(applicant.id)}
                              onChange={() => {}} // Handled by row click
                            />
                          </TableCell>
                          <TableCell className="font-medium">{applicant.name}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                              {applicant.source}
                            </span>
                          </TableCell>
                          <TableCell>{format(new Date(applicant.createdAt), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Previous Screenings</CardTitle>
              <CardDescription>History of AI evaluations for this role.</CardDescription>
            </CardHeader>
            <CardContent>
              {screenings.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">
                  No screenings run yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {screenings.map((screening) => (
                    <div key={screening.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {format(new Date(screening.createdAt), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {screening.results.length} candidates screened
                          </p>
                        </div>
                      </div>
                      <Button nativeButton={false} variant="ghost" size="sm" render={<Link to={`/screening/${id}/${screening.id}`} />}>
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
