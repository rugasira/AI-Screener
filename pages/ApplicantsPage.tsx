import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Users, 
  Mail, 
  Phone, 
  GraduationCap, 
  Briefcase, 
  Calendar, 
  MoreVertical, 
  Trash2, 
  ExternalLink,
  Filter,
  ArrowRight,
  ChevronRight,
  Upload,
  FileText,
  FolderOpen,
  CheckCircle2,
  X,
  Play,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { ScreeningProgressModal } from '@/components/ScreeningProgressModal';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { collection, getDocs, doc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useGooglePicker } from '@/hooks/useGooglePicker';
import { screenApplicants } from '@/lib/gemini';

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

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [jobs, setJobs] = useState<Record<string, any>>({});
  const [screeningMap, setScreeningMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadJobId, setUploadJobId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [applicantToDelete, setApplicantToDelete] = useState<string | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { loadScripts, openPicker, accessToken } = useGooglePicker();

  useEffect(() => {
    fetchData();
    loadScripts();
    
    // Handle search query from URL
    const query = searchParams.get('search');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch jobs first to map jobIds to titles
      const jobsSnapshot = await getDocs(collection(db, 'jobs'));
      const jobsMap: Record<string, any> = {};
      jobsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'draft') {
          jobsMap[doc.id] = { id: doc.id, ...data };
        }
      });
      setJobs(jobsMap);

      // Fetch applicants
      const applicantsSnapshot = await getDocs(query(collection(db, 'applicants'), orderBy('createdAt', 'desc')));
      const applicantsData = applicantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplicants(applicantsData);

      // Fetch screenings to show screening status
      const screeningsSnapshot = await getDocs(collection(db, 'screenings'));
      const sMap: Record<string, any> = {};
      screeningsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.results && Array.isArray(data.results)) {
          data.results.forEach((result: any) => {
            // Keep the latest screening result for each applicant
            if (!sMap[result.applicantId] || new Date(data.createdAt) > new Date(sMap[result.applicantId].createdAt)) {
              sMap[result.applicantId] = {
                ...result,
                createdAt: data.createdAt,
                screeningId: doc.id
              };
            }
          });
        }
      });
      setScreeningMap(sMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch applicants');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApplicant = async (id: string) => {
    setApplicantToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteApplicant = async () => {
    if (!applicantToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'applicants', applicantToDelete));
      toast.success('Applicant removed');
      setApplicants(prev => prev.filter(a => a.id !== applicantToDelete));
      setSelectedApplicants(prev => prev.filter(sid => sid !== applicantToDelete));
    } catch (error) {
      toast.error('Failed to delete applicant');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setApplicantToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      selectedApplicants.forEach(id => {
        batch.delete(doc(db, 'applicants', id));
      });
      await batch.commit();
      toast.success(`${selectedApplicants.length} applicants removed`);
      setApplicants(prev => prev.filter(a => !selectedApplicants.includes(a.id)));
      setSelectedApplicants([]);
    } catch (error) {
      toast.error('Failed to delete applicants');
    } finally {
      setIsDeleting(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  const handleBulkScreen = async () => {
    if (jobFilter === 'all') {
      toast.error('Please filter by a specific job to screen applicants');
      return;
    }
    if (selectedApplicants.length === 0) {
      toast.error('Please select at least one applicant to screen');
      return;
    }

    const job = jobs[jobFilter];
    if (!job) return;

    setScreeningLoading(true);
    toast.loading(`AI is screening ${selectedApplicants.length} candidates...`, { id: 'screening' });
    
    try {
      const applicantsToScreen = applicants.filter(a => selectedApplicants.includes(a.id));
      
      const rawResults = await screenApplicants(job, applicantsToScreen);
      
      // Deduplicate results by applicantId just in case
      const screeningResults = Array.from(
        new Map(rawResults.map((r: any) => [r.applicantId, r])).values()
      );

      const res = await fetch('/api/screenings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: jobFilter, results: screeningResults, applicantIds: selectedApplicants }),
      });
      
      if (res.ok) {
        const savedScreening = await res.json();
        toast.success('Screening completed successfully', { id: 'screening' });
        navigate(`/admin/screening/${jobFilter}/${savedScreening.id}`);
      } else {
        toast.error('Screening failed to save', { id: 'screening' });
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Screening failed', { id: 'screening' });
    } finally {
      setScreeningLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isFolder = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
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
    if (!uploadJobId) {
      toast.error('Please select a job first');
      return;
    }

    setUploading(true);
    toast.loading(`Uploading ${pendingFiles.length} resumes...`, { id: 'upload' });
    
    const formData = new FormData();
    for (let i = 0; i < pendingFiles.length; i++) {
      formData.append('resumes', pendingFiles[i]);
    }
    formData.append('jobId', uploadJobId);

    try {
      const res = await fetch('/api/applicants/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast.success(`Successfully uploaded ${pendingFiles.length} resumes`, { id: 'upload' });
        setIsUploadOpen(false);
        setPendingFiles([]);
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to upload resumes', { id: 'upload' });
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload resumes', { id: 'upload' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const toggleApplicantSelection = (id: string) => {
    setSelectedApplicants(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedApplicants.length === filteredApplicants.length) {
      setSelectedApplicants([]);
    } else {
      setSelectedApplicants(filteredApplicants.map(a => a.id));
    }
  };

  const filteredApplicants = applicants.filter(a => {
    const matchesSearch = 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.email && a.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.phone && a.phone.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesJob = jobFilter === 'all' || a.jobId === jobFilter;
    
    return matchesSearch && matchesJob;
  });

  const totalPages = Math.ceil(filteredApplicants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApplicants = filteredApplicants.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, jobFilter]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Applicants</h1>
          <p className="text-muted-foreground mt-1 font-medium">Manage all candidates across your job postings.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedApplicants.length > 0 && jobFilter !== 'all' && (
            <Button 
              className="bg-primary hover:bg-primary/90 font-bold shadow-none h-11 px-6 rounded-none animate-in fade-in slide-in-from-right-4 duration-300"
              onClick={handleBulkScreen}
              disabled={screeningLoading}
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Run AI Screening ({selectedApplicants.length})
            </Button>
          )}
          <Dialog open={isUploadOpen} onOpenChange={(open) => { setIsUploadOpen(open); if(!open) setPendingFiles([]); }}>
            <DialogTrigger render={
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-none h-11 px-6 rounded-none font-bold transition-all duration-300">
                <Upload className="mr-2 h-5 w-5" />
                Bulk Upload
              </Button>
            } />
            <DialogContent className="sm:max-w-[500px] rounded-none border-0 shadow-2xl p-0 overflow-hidden">
              <div className="bg-primary p-8 text-white">
                <DialogTitle className="text-3xl font-black tracking-tight">Bulk Upload</DialogTitle>
                <DialogDescription className="text-primary-foreground/80 font-medium mt-2">
                  Select a job posting and upload candidate resumes to begin screening.
                </DialogDescription>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Target Job Posting</Label>
                  <Select value={uploadJobId} onValueChange={setUploadJobId}>
                    <SelectTrigger className="h-14 border-slate-100 bg-slate-50 rounded-none focus:ring-primary/20">
                      <SelectValue placeholder="Choose a job role...">
                        {uploadJobId ? jobs[uploadJobId]?.title : "Choose a job role..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-slate-100">
                      {Object.values(jobs).map((job: any) => (
                        <SelectItem key={job.id} value={job.id} className="py-3 rounded-none">{job.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {pendingFiles.length === 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-32 flex flex-col gap-3 rounded-none border-2 border-dashed border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || !uploadJobId}
                    >
                      <div className="bg-slate-50 p-3 rounded-none group-hover:bg-white transition-colors">
                        <FileText className="h-6 w-6 text-slate-400 group-hover:text-primary" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-primary">Select Files</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-32 flex flex-col gap-3 rounded-none border-2 border-dashed border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group"
                      onClick={() => folderInputRef.current?.click()}
                      disabled={uploading || !uploadJobId}
                    >
                      <div className="bg-slate-50 p-3 rounded-none group-hover:bg-white transition-colors">
                        <FolderOpen className="h-6 w-6 text-slate-400 group-hover:text-primary" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-primary">Select Folder</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-32 flex flex-col gap-3 rounded-none border-2 border-dashed border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group col-span-2"
                      onClick={() => openPicker(handleDriveSelect)}
                      disabled={uploading || !uploadJobId}
                    >
                      <div className="bg-slate-50 p-3 rounded-xl group-hover:bg-white transition-colors">
                        <svg className="h-6 w-6 text-slate-400 group-hover:text-primary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.5,2L6.5,12.2L3.3,18h12l3-5.2L12.5,2z M10,12.2l2.5-4.3l2.5,4.3H10z M18.5,18l-3-5.2l3-5.2l3,5.2L18.5,18z M15.3,18H3.3l3-5.2h12L15.3,18z"/>
                        </svg>
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-primary">Upload from Google Drive</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 max-h-[200px] overflow-y-auto space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">{pendingFiles.length} Files Selected</span>
                        <Button variant="ghost" size="sm" onClick={() => setPendingFiles([])} className="h-7 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/5">Clear</Button>
                      </div>
                      {pendingFiles.slice(0, 5).map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="truncate">{file.name}</span>
                        </div>
                      ))}
                      {pendingFiles.length > 5 && (
                        <p className="text-[10px] font-bold text-slate-400 text-center py-1">And {pendingFiles.length - 5} more files...</p>
                      )}
                    </div>
                    <Button 
                      className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
                      onClick={confirmUpload}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Uploading...
                        </div>
                      ) : (
                        'Confirm & Upload Resumes'
                      )}
                    </Button>
                  </div>
                )}
                
                <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,.csv,.docx" onChange={(e) => handleFileUpload(e)} />
                <input type="file" ref={folderInputRef} className="hidden" webkitdirectory="" directory="" onChange={(e) => handleFileUpload(e, true)} />
                
                {!uploadJobId && (
                  <div className="flex items-center justify-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      Please select a job posting first
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email or phone..."
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
                <SelectValue placeholder="Filter by Job">
                  {jobFilter === 'all' ? 'All Job Postings' : jobs[jobFilter]?.title}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100">
              <SelectItem value="all" className="py-3 rounded-xl">All Job Postings</SelectItem>
              {Object.values(jobs).map((job: any) => (
                <SelectItem key={job.id} value={job.id} className="py-3 rounded-xl">{job.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteApplicant}
        title="Remove Applicant"
        description="Are you sure you want to remove this applicant? This action cannot be undone."
        isLoading={isDeleting}
      />

      <DeleteConfirmationDialog
        isOpen={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        onConfirm={confirmBulkDelete}
        title="Remove Multiple Applicants"
        description={`Are you sure you want to remove ${selectedApplicants.length} selected applicants? This action cannot be undone.`}
        isLoading={isDeleting}
      />

      <ScreeningProgressModal 
        isOpen={screeningLoading} 
        candidateCount={selectedApplicants.length} 
      />

      {selectedApplicants.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 p-4 flex justify-between items-center px-6 rounded-none shadow-none"
        >
          <div className="flex items-center gap-4">
            <span className="text-sm font-black text-white">
              {selectedApplicants.length} candidate{selectedApplicants.length !== 1 ? 's' : ''} selected
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5"
              onClick={() => setSelectedApplicants([])}
            >
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {jobFilter !== 'all' && (
              <Button 
                className="bg-primary hover:bg-primary/90 font-bold h-10 px-5 rounded-none border-0 shadow-none"
                onClick={handleBulkScreen}
                disabled={screeningLoading}
              >
                <Play className="mr-2 h-4 w-4 fill-current" />
                Screen Selected
              </Button>
            )}
            <Button 
              variant="destructive" 
              className="font-bold h-10 px-5 rounded-none border-0 shadow-none"
              onClick={handleBulkDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </motion.div>
      )}

      <Card className="border border-slate-100 shadow-none overflow-hidden rounded-none">
        <div className="h-2 w-full bg-primary" />
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Candidate Pool
          </CardTitle>
          <CardDescription className="font-medium">
            Showing {filteredApplicants.length} applicant{filteredApplicants.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground animate-pulse">Loading applicants...</p>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-black text-foreground">No applicants found</h3>
              <p className="text-muted-foreground mt-2">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="w-[50px] pl-6">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        checked={selectedApplicants.length === filteredApplicants.length && filteredApplicants.length > 0}
                        onChange={selectAllFiltered}
                      />
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Candidate</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Applied For</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Phone Number</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">AI Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Applied On</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Source</TableHead>
                    <TableHead className="w-[80px] pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <motion.tbody
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="[&_tr:last-child]:border-0"
                >
                  <AnimatePresence mode="popLayout">
                    {paginatedApplicants.map((applicant, idx) => (
                      <motion.tr 
                        key={`${applicant.id}-${idx}`}
                        variants={item}
                        className={cn(
                          "group hover:bg-muted/30 transition-colors border-border cursor-pointer",
                          selectedApplicants.includes(applicant.id) && "bg-primary/5"
                        )}
                        onClick={() => toggleApplicantSelection(applicant.id)}
                      >
                          <TableCell className="pl-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                              checked={selectedApplicants.includes(applicant.id)}
                              onChange={() => toggleApplicantSelection(applicant.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-black text-foreground text-base">{applicant.name}</span>
                              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mt-0.5">
                                <Mail className="h-3 w-3" />
                                {applicant.email || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link to={`/admin/jobs/${applicant.jobId}`} className="group/link">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground group-hover/link:text-primary transition-colors">
                                  {jobs[applicant.jobId]?.title || 'Unknown Job'}
                                </span>
                                <ChevronRight className="h-3 w-3 opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all text-primary" />
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                              <Phone className="h-4 w-4 text-primary/60" />
                              <span className="truncate max-w-[150px]">{applicant.phone || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {screeningMap[applicant.id] ? (
                              <Link to={`/admin/screening/${applicant.jobId}/${screeningMap[applicant.id].screeningId}?applicantId=${applicant.id}`}>
                                <div className="flex flex-col gap-1 group/status">
                                  <div className={cn(
                                    "inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                    screeningMap[applicant.id].matchScore >= (jobs[applicant.jobId]?.passingScore || 70)
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
                          <TableCell className="text-sm font-bold text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground/60" />
                              {format(new Date(applicant.createdAt), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "text-[10px] font-black px-2.5 py-1 rounded-none uppercase tracking-wider border",
                              applicant.source === 'upload' 
                                ? "bg-secondary text-primary border-primary/20" 
                                : "bg-green-50 text-green-600 border-green-100"
                            )}>
                              {applicant.source || 'Direct'}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-9 w-9 rounded-none hover:bg-muted flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors">
                                <MoreVertical className="h-5 w-5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="font-bold py-2.5 cursor-pointer" render={
                                  <Link to={`/admin/jobs/${applicant.jobId}`}>
                                    <div className="flex items-center">
                                      <Briefcase className="mr-2 h-4 w-4" />
                                      View Job Details
                                    </div>
                                  </Link>
                                } />
                                <DropdownMenuItem 
                                  className="text-destructive font-bold py-2.5 cursor-pointer focus:text-destructive focus:bg-destructive/5"
                                  onClick={() => handleDeleteApplicant(applicant.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Applicant
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </motion.tbody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-4 border-t border-slate-50 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages || 1}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 px-4 rounded-xl font-bold border-slate-100"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 px-4 rounded-xl font-bold border-slate-100"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
