import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  FileText, 
  FolderOpen, 
  Plus, 
  Search,
  Trash2,
  MoreVertical,
  Calendar,
  GraduationCap,
  ChevronRight,
  Target,
  FileSearch,
  Sparkles,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { ScreeningProgressModal } from '@/components/ScreeningProgressModal';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { GoogleGenAI } from '@google/genai';
import { screenApplicants } from '@/lib/gemini';
import { collection, getDocs, doc, getDoc, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useGooglePicker } from '@/hooks/useGooglePicker';

import { Applicant } from '@/types/talent';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [screenings, setScreenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [screeningProgress, setScreeningProgress] = useState(0);
  const [screeningMessage, setScreeningMessage] = useState('');
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [screeningMap, setScreeningMap] = useState<Record<string, any>>({});
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [applicantToDelete, setApplicantToDelete] = useState<string | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { loadScripts, openPicker, accessToken } = useGooglePicker();

  useEffect(() => {
    fetchJobDetails();
    fetchApplicants();
    loadScripts();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      if (!id) return;
      const jobDoc = await getDoc(doc(db, 'jobs', id));
      if (jobDoc.exists()) {
        setJob({ id: jobDoc.id, ...jobDoc.data() });
      } else {
        toast.error('Job not found');
        navigate('/admin/jobs');
      }
      
      const screeningsSnapshot = await getDocs(collection(db, 'screenings'));
      const screeningsData = screeningsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((s: any) => s.jobId === id);
      
      screeningsData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setScreenings(screeningsData);

      // Build a map of applicantId to their latest screening result for this job
      const sMap: Record<string, any> = {};
      screeningsData.forEach((s: any) => {
        if (s.results && Array.isArray(s.results)) {
          s.results.forEach((result: any) => {
            if (!sMap[result.applicantId] || new Date(s.createdAt) > new Date(sMap[result.applicantId].createdAt)) {
              sMap[result.applicantId] = {
                ...result,
                createdAt: s.createdAt,
                screeningId: s.id
              };
            }
          });
        }
      });
      setScreeningMap(sMap);
    } catch (error) {
      toast.error('Failed to fetch job details');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async () => {
    try {
      const applicantsSnapshot = await getDocs(collection(db, 'applicants'));
      const data = applicantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const jobApplicants = data.filter((a: any) => a.jobId === id);
      setApplicants(jobApplicants);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, isFolder = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
    setIsUploadOpen(true);
  };

  const handleDriveSelect = async (docs: any[]) => {
    if (!accessToken) return;
    
    setUploading(true);
    toast.loading(`Fetching ${docs.length} files from Drive...`, { id: 'drive-fetch' });
    
    try {
      const fetchedFiles: File[] = [];
      for (const doc of docs) {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], doc.name, { type: doc.mimeType });
          fetchedFiles.push(file);
        }
      }
      
      setPendingFiles(prev => [...prev, ...fetchedFiles]);
      setIsUploadOpen(true);
      toast.success(`Fetched ${fetchedFiles.length} files from Drive`, { id: 'drive-fetch' });
    } catch (error) {
      console.error('Error fetching from Drive:', error);
      toast.error('Failed to fetch files from Google Drive', { id: 'drive-fetch' });
    } finally {
      setUploading(false);
    }
  };

  const confirmUpload = async () => {
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setIsUploadOpen(false); // Move to background
    const taskName = `Uploading ${pendingFiles.length} resumes - ${job.title}`;
    
    // Add to active tasks (simulated persistent task)
    const activeTasks = JSON.parse(localStorage.getItem('activeTasks') || '[]');
    const taskId = Date.now();
    activeTasks.push({ id: taskId, name: taskName, progress: 0, type: 'upload' });
    localStorage.setItem('activeTasks', JSON.stringify(activeTasks));

    toast.info(`Upload started: ${taskName}. You can continue working.`, { id: `upload-${taskId}` });
    
    const formData = new FormData();
    for (let i = 0; i < pendingFiles.length; i++) {
      formData.append('resumes', pendingFiles[i]);
    }
    formData.append('jobId', id!);

    try {
      const res = await fetch('/api/applicants/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const uploadedCount = data.applicants?.length || 0;
        const duplicateCount = data.duplicates?.length || 0;

        if (duplicateCount > 0) {
          toast.warning(`${duplicateCount} candidates were skipped because they already exist for this job.`, {
            id: `upload-${taskId}`,
            duration: 8000,
            description: `Successfully uploaded ${uploadedCount} new candidates.`
          });
        } else {
          toast.success(`Upload complete: ${uploadedCount} resumes added to ${job.title}`, { 
            id: `upload-${taskId}`,
            duration: 5000,
            description: "Candidate screening can now be initiated."
          });
        }
        fetchApplicants();
      } else {
        const error = await res.json();
        toast.error(`Upload failed: ${error.message}`, { id: `upload-${taskId}` });
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload resumes', { id: `upload-${taskId}` });
    } finally {
      setUploading(false);
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
      
      // Remove from active tasks
      const updatedTasks = JSON.parse(localStorage.getItem('activeTasks') || '[]').filter((t: any) => t.id !== taskId);
      localStorage.setItem('activeTasks', JSON.stringify(updatedTasks));
    }
  };

  const handleDeleteScreening = async (screeningId: string) => {
    try {
      await deleteDoc(doc(db, 'screenings', screeningId));
      setScreenings(prev => prev.filter(s => s.id !== screeningId));
      toast.success('Screening history removed');
    } catch (error) {
      toast.error('Failed to remove screening history');
    }
  };

  const handleDeleteApplicant = async (applicantId: string) => {
    setApplicantToDelete(applicantId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteApplicant = async () => {
    if (!applicantToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'applicants', applicantToDelete));
      toast.success('Applicant deleted');
      fetchApplicants();
      setSelectedApplicants(prev => prev.filter(id => id !== applicantToDelete));
    } catch (error) {
      toast.error('Failed to delete applicant');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setApplicantToDelete(null);
    }
  };

  const handleDeleteAllApplicants = async () => {
    setIsDeleteAllDialogOpen(true);
  };

  const confirmDeleteAllApplicants = async () => {
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      applicants.forEach(a => {
        batch.delete(doc(db, 'applicants', a.id));
      });
      await batch.commit();
      toast.success('All applicants deleted');
      fetchApplicants();
      setSelectedApplicants([]);
    } catch (error) {
      toast.error('Failed to delete applicants');
    } finally {
      setIsDeleting(false);
      setIsDeleteAllDialogOpen(false);
    }
  };

  const handleScreen = async () => {
    if (selectedApplicants.length === 0) {
      toast.error('Please select at least one applicant to screen');
      return;
    }

    setScreeningLoading(true);
    setScreeningProgress(5);
    setScreeningMessage('Preparing evaluation pipeline...');
    
    const taskId = Date.now();
    const taskName = `Screening ${selectedApplicants.length} candidates - ${job.title}`;
    const activeTasks = JSON.parse(localStorage.getItem('activeTasks') || '[]');
    activeTasks.push({ id: taskId, name: taskName, progress: 5, type: 'screening' });
    localStorage.setItem('activeTasks', JSON.stringify(activeTasks));

    toast.info(`Screening started for ${selectedApplicants.length} candidates.`, { id: `screen-${taskId}` });

    try {
      const applicantsToScreen = applicants.filter(a => selectedApplicants.includes(a.id));
      
      // Live progress simulation through batching or step updates
      setScreeningProgress(20);
      setScreeningMessage('Extracting and analyzing professional data...');
      
      // Update global task progress
      const updateGlobalProgress = (p: number, msg: string) => {
        const tasks = JSON.parse(localStorage.getItem('activeTasks') || '[]');
        const idx = tasks.findIndex((t: any) => t.id === taskId);
        if (idx !== -1) {
          tasks[idx].progress = p;
          tasks[idx].message = msg;
          localStorage.setItem('activeTasks', JSON.stringify(tasks));
        }
      };

      // In a real app, you might screen in batches to show real progress
      await new Promise(r => setTimeout(r, 2000));
      setScreeningProgress(45);
      setScreeningMessage('Comparing expertise against role requirements...');
      updateGlobalProgress(45, 'Comparing expertise...');

      const screeningResults = await screenApplicants(job, applicantsToScreen);

      setScreeningProgress(85);
      setScreeningMessage('Finalizing evaluation reports...');
      updateGlobalProgress(85, 'Finalizing reports...');

      const res = await fetch('/api/screenings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id, results: screeningResults, applicantIds: selectedApplicants }),
      });
      
      if (res.ok) {
        const savedScreening = await res.json();
        setScreeningProgress(100);
        setScreeningMessage('Evaluation complete!');
        updateGlobalProgress(100, 'Complete!');
        
        toast.success(`Screening Complete! ${selectedApplicants.length} candidates evaluated.`, { 
          id: `screen-${taskId}`,
          duration: 6000,
          description: "View results in the applicant pool or screening history."
        });
        
        fetchJobDetails(); // Refresh to show scores
        setSelectedApplicants([]);
      } else {
        toast.error('Screening failed to save', { id: `screen-${taskId}` });
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Screening failed', { id: `screen-${taskId}` });
    } finally {
      setScreeningLoading(false);
      // Remove from active tasks after a delay
      setTimeout(() => {
        const updatedTasks = JSON.parse(localStorage.getItem('activeTasks') || '[]').filter((t: any) => t.id !== taskId);
        localStorage.setItem('activeTasks', JSON.stringify(updatedTasks));
      }, 2000);
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
    if (selectedApplicants.length === filteredApplicants.length) {
      setSelectedApplicants([]);
    } else {
      setSelectedApplicants(filteredApplicants.map(a => a.id));
    }
  };

  const filteredApplicants = applicants.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.email && a.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (a.education && a.education.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <div className="bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-black">Job not found</h2>
        <Link to="/admin/jobs">
          <Button className="mt-6">Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <Link to="/admin/jobs">
            <Button variant="outline" size="icon" className="rounded-xl border-border hover:bg-white hover:shadow-md transition-all h-12 w-12">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tight text-foreground">{job.title}</h1>
              <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20">
                {job.type}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-4 font-bold">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                Posted {format(new Date(job.createdAt), 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1.5 focus:text-primary">
                <Target className="h-4 w-4 text-primary" />
                {job.location}
              </span>
              {job.salaryRange && (
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {job.salaryRange}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Action buttons moved to applicant section */}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-3 space-y-8">
          <Card className="border-0 shadow-xl overflow-hidden rounded-2xl">
            <div className="h-2 w-full bg-primary" />
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-black flex items-center gap-2">
                <FileSearch className="h-6 w-6 text-primary" />
                Role Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-4">
              <div className="bg-muted/30 p-8 rounded-3xl border border-border/50 space-y-8">
                <div>
                  <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Key Requirements
                  </h3>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap font-medium text-lg">{job.requirements}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-6 border-t border-border/40">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Experience</h4>
                    <p className="text-xl font-black text-foreground">{job.experience}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pass Score</h4>
                    <p className="text-xl font-black text-primary flex items-center gap-1.5">
                      <Target className="h-5 w-5" />
                      {job.passingScore || 70}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Location</h4>
                    <p className="text-xl font-black text-foreground">{job.location}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Comp Range</h4>
                    <p className="text-xl font-black text-emerald-600">{job.salaryRange || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                  Required Expertise
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {job.skills ? job.skills.split(',').map((skill: string, i: number) => (
                    <span key={i} className="bg-white text-slate-700 text-[11px] font-bold px-5 py-2 rounded-xl border border-slate-200 shadow-sm uppercase tracking-wider hover:border-primary/30 transition-colors cursor-default">
                      {skill.trim()}
                    </span>
                  )) : <span className="text-muted-foreground italic">No skills specified</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl overflow-hidden rounded-2xl">
            <div className="h-2 w-full bg-primary" />
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 pb-6">
              <div>
                <CardTitle className="text-2xl font-black flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Applicant Pool
                </CardTitle>
                <CardDescription className="font-medium">Select candidates to initiate AI evaluation.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple 
                  accept=".pdf,.docx,.doc" 
                  onChange={(e) => handleFileUpload(e)}
                />
                <input 
                  type="file" 
                  ref={folderInputRef} 
                  className="hidden" 
                  webkitdirectory="" 
                  directory="" 
                  onChange={(e) => handleFileUpload(e, true)}
                />
                
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-9 font-bold rounded-lg px-3">
                  <FileText className="mr-2 h-4 w-4 text-primary" />
                  Upload
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="outline" size="sm" className="h-9 font-bold rounded-lg px-2">
                      <Plus className="h-4 w-4" />
                    </Button>
                  } />
                  <DropdownMenuContent align="end" className="w-48 rounded-xl font-bold">
                    <DropdownMenuItem onClick={() => folderInputRef.current?.click()} className="cursor-pointer">
                      <FolderOpen className="mr-2 h-4 w-4 text-primary" />
                      Upload Folder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openPicker(handleDriveSelect)} className="cursor-pointer">
                      <svg className="mr-2 h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.5,2L6.5,12.2L3.3,18h12l3-5.2L12.5,2z M10,12.2l2.5-4.3l2.5,4.3H10z M18.5,18l-3-5.2l3-5.2l3,5.2L18.5,18z M15.3,18H3.3l3-5.2h12L15.3,18z"/>
                      </svg>
                      From Drive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-[1px] h-6 bg-border mx-1" />

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search candidates..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 border-border rounded-xl shadow-sm"
                  />
                </div>

                <Button 
                  onClick={handleScreen} 
                  disabled={screeningLoading || selectedApplicants.length === 0} 
                  size="sm"
                  className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/10 h-10 px-4 font-bold rounded-xl ml-auto"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Screening
                </Button>

                {applicants.length > 0 && (
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl h-10 w-10 ml-2" onClick={handleDeleteAllApplicants}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScreeningProgressModal 
                isOpen={screeningLoading} 
                candidateCount={selectedApplicants.length} 
                onClose={() => setScreeningLoading(false)}
                progress={screeningProgress}
                message={screeningMessage}
              />
              <Dialog open={isUploadOpen} onOpenChange={(open) => { setIsUploadOpen(open); if(!open) setPendingFiles([]); }}>
                <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
                  <div className="bg-primary p-8 text-white">
                    <DialogTitle className="text-3xl font-black tracking-tight">Process Resumes</DialogTitle>
                    <DialogDescription className="text-primary-foreground/80 font-medium mt-2">
                      Review {pendingFiles.length} files.
                    </DialogDescription>
                  </div>
                  <div className="p-8 space-y-6">
                    <Button 
                      className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
                      onClick={confirmUpload}
                    >
                      Process & Upload
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <DeleteConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={confirmDeleteApplicant}
                title="Remove Applicant"
                description="Are you sure you want to remove this applicant? This action cannot be undone."
                isLoading={isDeleting}
              />

              <DeleteConfirmationDialog
                isOpen={isDeleteAllDialogOpen}
                onOpenChange={setIsDeleteAllDialogOpen}
                onConfirm={confirmDeleteAllApplicants}
                title="Remove All Applicants"
                description="Are you sure you want to remove ALL applicants for this job? This action cannot be undone."
                isLoading={isDeleting}
              />
              <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="w-[60px] text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          checked={selectedApplicants.length === filteredApplicants.length && filteredApplicants.length > 0}
                          onChange={selectAllApplicants}
                        />
                      </TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Candidate</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Phone Number</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">AI Status</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Source</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Applied On</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <motion.tbody
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="[&_tr:last-child]:border-0"
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredApplicants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex flex-col items-center justify-center space-y-3"
                            >
                              <Users className="h-12 w-12 opacity-10" />
                              <p className="font-bold">No candidates found matching your search.</p>
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredApplicants.map((applicant) => (
                          <motion.tr 
                            key={applicant.id}
                            variants={item}
                            className={cn(
                              "group cursor-pointer transition-all duration-200 border-border",
                              selectedApplicants.includes(applicant.id) ? "bg-primary/5" : "hover:bg-muted/30"
                            )}
                            onClick={() => toggleApplicantSelection(applicant.id)}
                          >
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                checked={selectedApplicants.includes(applicant.id)}
                                onChange={() => toggleApplicantSelection(applicant.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-black text-foreground">{applicant.name}</span>
                                <span className="text-xs font-bold text-muted-foreground">{applicant.email || 'No email'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                                <Phone className="h-4 w-4 text-primary/60" />
                                <span className="truncate max-w-[180px]">{applicant.phone || 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {screeningMap[applicant.id] ? (
                                <Link to={`/admin/screening/${id}/${screeningMap[applicant.id].screeningId}?applicantId=${applicant.id}`} onClick={(e) => e.stopPropagation()}>
                                  <div className="flex flex-col gap-1 group/status">
                                    <div className={cn(
                                      "inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                      screeningMap[applicant.id].matchScore >= (job.passingScore || 70)
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : "bg-rose-50 text-rose-600 border-rose-100"
                                    )}>
                                      <Sparkles className="h-3 w-3" />
                                      {screeningMap[applicant.id].matchScore}% Match
                                    </div>
                                    <span className="text-[9px] font-bold text-muted-foreground group-hover/status:text-primary transition-colors">
                                      View Report
                                    </span>
                                  </div>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
                                  Not Screened
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="bg-muted text-muted-foreground text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border border-border">
                                {applicant.source}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs font-bold text-muted-foreground">
                              {format(new Date(applicant.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                                  <MoreVertical className="h-5 w-5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem className="text-destructive font-bold focus:text-destructive focus:bg-destructive/5" onClick={() => handleDeleteApplicant(applicant.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </motion.tbody>
                </Table>
              </div>
            </CardContent>
            {selectedApplicants.length > 0 && (
              <CardFooter className="bg-primary/5 border-t border-primary/10 py-4 flex justify-between items-center">
                <p className="text-sm font-black text-primary">
                  {selectedApplicants.length} candidate{selectedApplicants.length !== 1 ? 's' : ''} selected for screening
                </p>
                <Button size="sm" onClick={handleScreen} disabled={screeningLoading} className="font-bold shadow-md shadow-primary/10">
                  Screen Selected ({selectedApplicants.length})
                </Button>
              </CardFooter>
            )}
          </Card>

          <Card className="border-0 shadow-xl overflow-hidden rounded-2xl mt-8">
            <div className="h-2 w-full bg-primary" />
            <CardHeader>
              <CardTitle className="text-2xl font-black flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-primary" />
                Screening History
              </CardTitle>
              <CardDescription className="font-medium">Review past AI evaluations for this job role.</CardDescription>
            </CardHeader>
            <CardContent>
              {screenings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border text-center">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-bold">No screenings run yet.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {screenings.map((s) => (
                    <div key={s.id} className="relative group">
                      <Link 
                        to={`/admin/screening/${id}/${s.id}`}
                        className="flex items-center justify-between p-5 border border-border rounded-2xl hover:bg-white hover:shadow-lg hover:border-primary/30 transition-all overflow-hidden pr-12 w-full text-left"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform" />
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-2.5 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-foreground">
                              {format(new Date(s.createdAt), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs font-bold text-muted-foreground">
                              {s.results.length} candidates evaluated
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteScreening(s.id); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground h-8 w-8 hover:text-destructive hover:bg-destructive/10 rounded-lg group-hover:opacity-100 opacity-0 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
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


