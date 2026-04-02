import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, Star, Download, ChevronRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export default function ScreeningPage() {
  const { jobId, screeningId } = useParams();
  const [job, setJob] = useState<any>(null);
  const [screening, setScreening] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmails, setSendingEmails] = useState<Record<string, boolean>>({});
  const [sentEmails, setSentEmails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchScreeningDetails();
  }, [jobId, screeningId]);

  const fetchScreeningDetails = async () => {
    try {
      const [jobRes, screeningsRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch(`/api/screenings/${jobId}`)
      ]);
      const jobs = await jobRes.json();
      const jobData = jobs.find((j: any) => j.id === jobId);
      setJob(jobData);
      
      const screeningsData = await screeningsRes.json();
      if (screeningsData.length > 0) {
        let targetScreening;
        if (screeningId) {
          targetScreening = screeningsData.find((s: any) => s.id === screeningId);
        }
        
        if (!targetScreening) {
          // Fallback to latest if not found or no ID provided
          targetScreening = screeningsData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        }

        // Sort results by rank
        targetScreening.results.sort((a: any, b: any) => a.rank - b.rank);
        setScreening(targetScreening);
      }
    } catch (error) {
      toast.error('Failed to fetch screening details');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (applicantId: string, email: string, body: string, matchScore: number) => {
    if (!email) {
      toast.error("Applicant doesn't have an email address.");
      return;
    }

    setSendingEmails(prev => ({ ...prev, [applicantId]: true }));
    try {
      const subject = matchScore >= (job.passingScore || 70) 
        ? `Interview Invitation: ${job.title} at Umurava` 
        : `Update on your application for ${job.title}`;

      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, subject, body }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Email sent successfully!');
        if (data.previewUrl) {
          console.log("Email Preview URL:", data.previewUrl);
          toast.info('Check console for Ethereal Email preview URL');
        }
        setSentEmails(prev => ({ ...prev, [applicantId]: true }));
      } else {
        toast.error(data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to send email');
    } finally {
      setSendingEmails(prev => ({ ...prev, [applicantId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!job || !screening) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">No screening results found</h2>
        <p className="mt-2 text-gray-500">Run a screening first from the job details page.</p>
        <Button nativeButton={false} render={<Link to={`/jobs/${jobId}`} />} className="mt-4">
          Back to Job
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button nativeButton={false} variant="ghost" size="icon" render={<Link to={`/jobs/${jobId}`} />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI Screening Results</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">For {job.title}</p>
              <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 uppercase tracking-wider">
                {job.type === 'internship' ? 'Internship' : 'Full-time Job'}
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Accordion type="multiple" className="grid gap-6">
        {screening.results.map((result: any, index: number) => (
          <Card key={index} className="overflow-hidden border-l-4" style={{ borderLeftColor: result.matchScore >= 80 ? '#22c55e' : result.matchScore >= 60 ? '#eab308' : '#ef4444' }}>
            <AccordionItem value={`item-${index}`} className="border-b-0">
              <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
                      #{result.rank}
                    </div>
                    <div className="text-left">
                      <CardTitle className="text-xl">{result.applicant?.name || 'Unknown Candidate'}</CardTitle>
                      <CardDescription className="mt-1">
                        Match Score: <span className="font-semibold text-gray-900">{result.matchScore}%</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="w-32 hidden sm:block">
                    <Progress value={result.matchScore} className="h-2" />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="flex items-center text-sm font-semibold text-green-700 mb-3">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Key Strengths
                    </h4>
                    <ul className="space-y-2">
                      {result.strengths.map((strength: string, i: number) => (
                        <li key={i} className="flex items-start text-sm text-gray-700">
                          <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="flex items-center text-sm font-semibold text-amber-700 mb-3">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Gaps & Risks
                    </h4>
                    <ul className="space-y-2">
                      {result.gaps.map((gap: string, i: number) => (
                        <li key={i} className="flex items-start text-sm text-gray-700">
                          <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">AI Recommendation</h4>
                  <p className="text-sm text-gray-700 leading-relaxed bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    {result.finalRecommendation}
                  </p>
                </div>

                {result.emailDraft && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {result.matchScore >= (job.passingScore || 70) ? 'Interview Invitation Email Draft' : 'Rejection Email Draft'}
                      </h4>
                      <Button 
                        size="sm" 
                        onClick={() => handleSendEmail(result.applicantId, result.applicant?.email, result.emailDraft, result.matchScore)}
                        disabled={sendingEmails[result.applicantId] || sentEmails[result.applicantId] || !result.applicant?.email}
                        className={sentEmails[result.applicantId] ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {sendingEmails[result.applicantId] ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Sending...
                          </div>
                        ) : sentEmails[result.applicantId] ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Sent
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send Email
                          </>
                        )}
                      </Button>
                    </div>
                    {!result.applicant?.email && (
                      <p className="text-xs text-red-500 mb-2">Cannot send: No email address found for this applicant.</p>
                    )}
                    <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700 whitespace-pre-wrap border border-gray-200">
                      {result.emailDraft}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="profile">
                      <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-gray-900">
                        View Original Profile Data
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="bg-gray-50 p-4 rounded-md text-xs font-mono text-gray-600 overflow-auto max-h-64 whitespace-pre-wrap">
                          {JSON.stringify(result.applicant?.profileData, null, 2)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Card>
        ))}
      </Accordion>
    </div>
  );
}
