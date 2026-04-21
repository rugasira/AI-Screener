import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Star, 
  Download, 
  ChevronRight, 
  Send, 
  Mail, 
  Eye, 
  FileText, 
  User,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BatchEmailModal } from '@/components/BatchEmailModal';

const ResumeViewer = ({ applicant }: { applicant: any }) => {
  const text = applicant?.resumeText || applicant?.profileData?.resumeText;
  
  if (!text) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <User className="h-5 w-5" />
          </div>
          <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Profile Information</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {applicant?.profileData && Object.entries(applicant.profileData).map(([key, value]) => (
            value && typeof value !== 'object' && key !== 'resumeText' && (
              <div key={key} className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <p className="text-sm font-bold text-slate-700">{String(value)}</p>
              </div>
            )
          ))}
        </div>
        {(!applicant?.profileData || Object.keys(applicant.profileData).length === 0) && (
          <p className="text-slate-400 italic text-center py-8">No detailed data available for this candidate.</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden ring-1 ring-slate-200/50">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
             <FileText className="h-5 w-5" />
           </div>
           <div>
             <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Original Resume View</h4>
             <p className="text-[10px] font-bold text-slate-400 mt-0.5">Scanned and verified by Umurava AI</p>
           </div>
         </div>
         <Badge variant="secondary" className="bg-white text-emerald-600 border border-emerald-100 font-black text-[10px] px-3 py-1 rounded-lg shadow-sm">
           <CheckCircle2 className="h-3 w-3 mr-1.5" />
           DATA PERSISTED
         </Badge>
      </div>
      <ScrollArea className="h-[600px] w-full bg-white">
        <div className="p-12 font-serif text-slate-800 leading-[1.8] whitespace-pre-wrap text-base md:text-lg selection:bg-primary/20 selection:text-primary max-w-3xl mx-auto">
          {text}
        </div>
      </ScrollArea>
      <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End of Resume Document</p>
      </div>
    </div>
  );
};

export default function ScreeningPage() {
  const { jobId, screeningId } = useParams();
  const [searchParams] = useSearchParams();
  const applicantIdFilter = searchParams.get('applicantId');
  
  const [job, setJob] = useState<any>(null);
  const [screening, setScreening] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmails, setSendingEmails] = useState<Record<string, boolean>>({});
  const [sentEmails, setSentEmails] = useState<Record<string, boolean>>({});
  const [isBatchEmailOpen, setIsBatchEmailOpen] = useState(false);
  const [openSourceData, setOpenSourceData] = useState<Record<number, string>>({});

  const handleEmailDraftChange = (index: number, newDraft: string) => {
    if (!screening) return;
    const newResults = [...screening.results];
    newResults[index] = { ...newResults[index], emailDraft: newDraft };
    setScreening({ ...screening, results: newResults });
  };

  useEffect(() => {
    fetchScreeningDetails();
  }, [jobId, screeningId, applicantIdFilter]);

  const fetchScreeningDetails = async () => {
    try {
      if (!jobId) return;
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      if (jobDoc.exists()) {
        setJob({ id: jobDoc.id, ...jobDoc.data() });
      }
      
      const screeningsSnapshot = await getDocs(collection(db, 'screenings'));
      const screeningsData = screeningsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((s: any) => s.jobId === jobId);

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
      console.error('Failed to fetch screening details:', error);
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

  const handleExportCSV = () => {
    if (!screening || !screening.results || !job) return;

    const headers = ['Name', 'Email', 'Phone Number', 'Position Applied For', 'Match Score', 'AI Decision'];
    
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const result of screening.results) {
      const applicant = result.applicant || {};
      
      // Escape fields to handle commas and quotes in CSV
      const escapeCSV = (field: any) => {
        if (field === null || field === undefined) return '""';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      };

      const row = [
        escapeCSV(applicant.name || 'Unknown'),
        escapeCSV(applicant.email || 'N/A'),
        escapeCSV(applicant.phone || 'N/A'),
        escapeCSV(job.title || 'N/A'),
        escapeCSV(result.matchScore),
        escapeCSV(result.finalRecommendation || 'N/A')
      ];
      
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${job.title.replace(/\s+/g, '_')}_candidates_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exported Successfully');
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
        <Link to={`/admin/jobs/${jobId}`}>
          <Button className="mt-4">
            Back to Job
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to={`/admin/jobs/${jobId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {applicantIdFilter ? 'Candidate Evaluation' : 'AI Screening Results'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">For {job.title}</p>
              <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 uppercase tracking-wider">
                {job.type === 'internship' ? 'Internship' : 'Full-time Job'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {screening.results.some((r: any) => r.emailDraft) && (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-200"
              onClick={() => setIsBatchEmailOpen(true)}
            >
              <Mail className="mr-2 h-4 w-4" />
              Review & Send Outreach ({screening.results.filter((r: any) => r.emailDraft && !sentEmails[r.applicantId]).length})
            </Button>
          )}
          {applicantIdFilter && (
            <Link to={`/admin/screening/${jobId}/${screeningId}`}>
              <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-500">
                View All Candidates
              </Button>
            </Link>
          )}
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Accordion type="multiple" className="grid gap-6">
        {screening.results
          .filter((r: any) => !applicantIdFilter || r.applicantId === applicantIdFilter)
          .map((result: any, index: number) => {
          const passScore = job.passingScore || 70;
          const isPassed = result.matchScore >= passScore;
          const isExceptional = result.matchScore >= 90;

          let ringColor = 'ring-slate-200';
          let glowClass = '';
          let badgeColor = 'bg-slate-100 text-slate-700';

          if (isExceptional) {
            ringColor = 'ring-emerald-500';
            glowClass = 'shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-500';
            badgeColor = 'bg-emerald-100 text-emerald-800';
          } else if (isPassed) {
            ringColor = 'ring-amber-500';
            glowClass = 'shadow-[0_0_15px_rgba(245,158,11,0.2)] border-amber-500';
            badgeColor = 'bg-amber-100 text-amber-800';
          } else {
            ringColor = 'ring-rose-500';
            badgeColor = 'bg-rose-100 text-rose-800';
          }

          return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className={`overflow-hidden border transition-all duration-200 bg-white shadow-sm hover:shadow-md ${isExceptional ? 'border-emerald-200' : isPassed ? 'border-amber-200' : 'border-slate-200'}`}>
              <AccordionItem value={`item-${index}`} className="border-b-0">
                <AccordionTrigger className="hover:no-underline px-6 py-4 bg-white transition-colors group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-4 gap-4">
                    <div className="flex items-center space-x-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold text-lg ${badgeColor}`}>
                        #{result.rank}
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-lg font-bold text-slate-800">{result.applicant?.name || 'Unknown Candidate'}</CardTitle>
                        <CardDescription className="mt-1 text-sm font-medium text-slate-500 flex items-center gap-2">
                          Score:
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${badgeColor}`}>
                            {result.matchScore}%
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="w-full sm:w-32 hidden sm:block">
                      <Progress 
                        value={result.matchScore} 
                        className="h-2 bg-slate-100" 
                        indicatorClassName={isPassed ? (isExceptional ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-slate-400'} 
                      />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-0">
                  <div className="grid md:grid-cols-2 gap-6 mt-4">
                    <div className="bg-emerald-50/30 rounded-xl p-4 border border-emerald-50">
                      <h4 className="flex items-center text-sm font-bold text-emerald-700 mb-3">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Key Strengths
                      </h4>
                      <ul className="space-y-2">
                        {result.strengths.map((strength: string, i: number) => (
                          <li key={i} className="flex items-start text-sm text-slate-600">
                            <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-amber-50/30 rounded-xl p-4 border border-amber-50">
                      <h4 className="flex items-center text-sm font-bold text-amber-700 mb-3">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Gaps & Risks
                      </h4>
                      <ul className="space-y-2">
                        {result.gaps.map((gap: string, i: number) => (
                          <li key={i} className="flex items-start text-sm text-slate-600">
                            <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                <div className="mt-5 pt-5 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">AI Recommendation</h4>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {result.finalRecommendation}
                  </p>
                </div>

                {result.emailDraft && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {isPassed ? 'Interview Invitation Email' : 'Rejection Email'}
                      </h4>
                      <Button 
                        size="sm" 
                        onClick={() => handleSendEmail(result.applicantId, result.applicant?.email, result.emailDraft, result.matchScore)}
                        disabled={sendingEmails[result.applicantId] || sentEmails[result.applicantId] || !result.applicant?.email}
                        className={cn(
                          "rounded-md font-semibold px-4 transition-all",
                          sentEmails[result.applicantId] ? "bg-emerald-600 hover:bg-emerald-700" : ""
                        )}
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
                            Send Draft
                          </>
                        )}
                      </Button>
                    </div>
                    {!result.applicant?.email && (
                      <p className="text-xs text-rose-500 mb-2 font-medium">Cannot send: No email address found for this candidate.</p>
                    )}
                    <Textarea 
                      value={result.emailDraft}
                      onChange={(e) => handleEmailDraftChange(index, e.target.value)}
                      disabled={sentEmails[result.applicantId] || sendingEmails[result.applicantId]}
                      className="bg-white p-4 rounded-xl text-sm text-slate-700 min-h-[150px] border border-slate-200 focus:ring-primary/20"
                    />
                  </div>
                )}

                <div className="mt-10">
                  <Accordion 
                    type="single" 
                    collapsible 
                    className="w-full"
                    value={openSourceData[index]}
                    onValueChange={(val) => setOpenSourceData(prev => ({ ...prev, [index]: val }))}
                  >
                    <AccordionItem value="profile" className="border-0 shadow-none">
                      <AccordionTrigger className="w-full h-16 bg-primary hover:bg-primary/95 text-white rounded-2xl px-6 data-[state=open]:rounded-b-none transition-all hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Eye className="h-5 w-5" />
                          <span className="font-black text-xs uppercase tracking-[0.2em]">View Original Source Data</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0 border-x border-b border-slate-200 rounded-b-2xl overflow-hidden bg-slate-50/30">
                        <div className="p-4 md:p-8 space-y-6">
                          <ResumeViewer applicant={result.applicant} />
                          <div className="flex justify-center pb-4">
                            <Button 
                              variant="ghost" 
                              onClick={() => setOpenSourceData(prev => ({ ...prev, [index]: "" }))}
                              className="text-slate-400 hover:text-slate-600 font-bold gap-2"
                            >
                              <XCircle className="h-4 w-4" />
                              Close Source Data
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Card>
          </motion.div>
        )})}
      </Accordion>

      {screening && (
        <BatchEmailModal 
          isOpen={isBatchEmailOpen}
          onClose={() => setIsBatchEmailOpen(false)}
          emails={screening.results
            .filter((r: any) => r.emailDraft)
            .map((r: any) => ({
              applicantId: r.applicantId,
              name: r.applicant?.name || 'Candidate',
              email: r.applicant?.email || '',
              subject: r.matchScore >= (job.passingScore || 70) 
                ? `Interview Invitation: ${job.title} at Umurava` 
                : `Update on your application for ${job.title}`,
              body: r.emailDraft,
              status: sentEmails[r.applicantId] ? 'sent' : 'pending'
            }))}
          onFinish={() => {
            // Update sent state locally
            const newSent = { ...sentEmails };
            screening.results.forEach((r: any) => {
              if (r.emailDraft) newSent[r.applicantId] = true;
            });
            setSentEmails(newSent);
          }}
        />
      )}
    </div>
  );
}
