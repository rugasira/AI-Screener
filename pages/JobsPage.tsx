import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Briefcase, 
  Calendar, 
  Users, 
  Wand2, 
  Trash2, 
  Edit, 
  ChevronRight, 
  Target,
  Clock,
  Sparkles,
  Upload,
  FileText,
  FolderOpen,
  X,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

import { generateJobDetails, recommendSkills } from '@/lib/gemini';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 }
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingJobId, setUploadingJobId] = useState<string | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadJobId, setBulkUploadJobId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearDraftsDialogOpen, setIsClearDraftsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'draft'>('active');
  const [recommendedSkills, setRecommendedSkills] = useState<string[]>([]);
  const [isGeneratingSkills, setIsGeneratingSkills] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bulkFileInputRef = React.useRef<HTMLInputElement>(null);
  const bulkFolderInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('job');
  const [requirements, setRequirements] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [passingScore, setPassingScore] = useState('70');
  const [deadline, setDeadline] = useState('');

  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchJobs();
    
    // Handle search query from URL
    const query = searchParams.get('search');
    if (query) {
      setSearchQuery(query);
    }
    
    // Check for local draft on mount
    const saved = localStorage.getItem('job_creation_draft');
    if (saved) {
      setHasUnsavedChanges(true);
    }
  }, []);

  // Auto-save form state to local storage for persistence
  useEffect(() => {
    const hasContent = title || location || requirements || skills || experience || salaryRange || deadline;
    if (!editingJobId && hasContent && (isCreateOpen || isEditOpen)) {
      const draftData = {
        title, location, type, requirements, skills, experience, salaryRange, passingScore, deadline
      };
      localStorage.setItem('job_creation_draft', JSON.stringify(draftData));
      setHasUnsavedChanges(true);
    }
  }, [title, location, type, requirements, skills, experience, salaryRange, passingScore, deadline, editingJobId, isCreateOpen, isEditOpen]);

  const loadLocalDraft = () => {
    const saved = localStorage.getItem('job_creation_draft');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setTitle(data.title || '');
        setLocation(data.location || '');
        setType(data.type || 'job');
        setRequirements(data.requirements || '');
        setSkills(data.skills || '');
        setExperience(data.experience || '');
        setSalaryRange(data.salaryRange || '');
        setPassingScore(data.passingScore || '70');
        setDeadline(data.deadline || '');
        setHasUnsavedChanges(true);
        toast.info('Draft resumed', { description: 'You have unfinished work from your last session.' });
        return true;
      } catch (e) {
        console.error('Error parsing draft', e);
      }
    }
    return false;
  };

  const clearLocalDraft = () => {
    localStorage.removeItem('job_creation_draft');
    setHasUnsavedChanges(false);
  };

  const handleClearAllDrafts = async () => {
    setIsClearDraftsDialogOpen(true);
  };

  const confirmClearAllDrafts = async () => {
    const drafts = jobs.filter(j => j.status === 'draft');
    if (drafts.length === 0) return;
    
    setIsDeleting(true);
    try {
      const promises = drafts.map(d => deleteDoc(doc(db, 'jobs', d.id)));
      await Promise.all(promises);
      toast.success(`Cleared ${drafts.length} drafts`);
      fetchJobs();
    } catch (error) {
      console.error('Error clearing drafts:', error);
      toast.error('Failed to clear drafts');
    } finally {
      setIsDeleting(false);
      setIsClearDraftsDialogOpen(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'jobs'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (job: any) => {
    setEditingJobId(job.id);
    setTitle(job.title);
    setLocation(job.location || '');
    setType(job.type);
    setRequirements(job.requirements);
    setSkills(job.skills);
    setExperience(job.experience);
    setSalaryRange(job.salaryRange || '');
    setPassingScore(job.passingScore?.toString() || '70');
    setDeadline(job.deadline || '');
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setTitle('');
    setLocation('');
    setType('job');
    setRequirements('');
    setSkills('');
    setExperience('');
    setSalaryRange('');
    setPassingScore('70');
    setDeadline('');
    setEditingJobId(null);
    setRecommendedSkills([]);
  };

  const handleCreateOrEditJob = async (e: React.FormEvent, status: 'active' | 'draft' = 'active') => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      const jobData = {
        title,
        location,
        type,
        requirements,
        skills,
        experience,
        salaryRange,
        passingScore: parseInt(passingScore, 10),
        deadline,
        status,
        createdAt: editingJobId ? jobs.find(j => j.id === editingJobId).createdAt : new Date().toISOString()
      };

      if (editingJobId) {
        await updateDoc(doc(db, 'jobs', editingJobId), jobData);
        toast.success(status === 'draft' ? 'Draft saved' : 'Job updated', {
          description: status === 'draft' ? 'You can complete this role later in the Drafts tab.' : undefined
        });
      } else {
        const newJobRef = doc(collection(db, 'jobs'));
        await setDoc(newJobRef, { id: newJobRef.id, ...jobData });
        // Clear local draft upon successful save/publish of a new role
        clearLocalDraft();
        toast.success(status === 'draft' ? 'Draft saved' : 'Job created', {
          description: status === 'draft' ? 'You can find this role in the Drafts tab.' : undefined
        });
      }

      setIsCreateOpen(false);
      setIsEditOpen(false);
      fetchJobs();
      resetForm();
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error(editingJobId ? 'Failed to update job' : 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = async (id: string) => {
    setJobToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'jobs', jobToDelete));
      toast.success('Job deleted successfully');
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setJobToDelete(null);
    }
  };

  const fetchRecommendedSkills = async () => {
    if (!title) {
      toast.error('Please enter a job title first');
      return;
    }
    setIsGeneratingSkills(true);
    try {
      const skillsArr = await recommendSkills(title);
      setRecommendedSkills(skillsArr);
      if (skillsArr.length === 0) {
        toast.error('Could not generate skills. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
      toast.error('Failed to fetch recommendations');
    } finally {
      setIsGeneratingSkills(false);
    }
  };

  const toggleSkill = (skill: string) => {
    const currentSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
    if (currentSkills.some(s => s.toLowerCase() === skill.toLowerCase())) {
      setSkills(currentSkills.filter(s => s.toLowerCase() !== skill.toLowerCase()).join(', '));
    } else {
      setSkills([...currentSkills, skill].join(', '));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, jobId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    toast.loading(`Uploading ${files.length} resumes...`, { id: 'upload' });
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('resumes', files[i]);
    }
    formData.append('jobId', jobId);

    try {
      const res = await fetch('/api/applicants/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast.success(`Successfully uploaded ${files.length} resumes`, { id: 'upload' });
        setIsBulkUploadOpen(false);
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to upload resumes', { id: 'upload' });
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload resumes', { id: 'upload' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
      if (bulkFolderInputRef.current) bulkFolderInputRef.current.value = '';
      setUploadingJobId(null);
    }
  };

  const allFilteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.skills.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredJobs = allFilteredJobs.filter(job => {
    if (activeTab === 'active') return job.status !== 'draft';
    return job.status === 'draft';
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple 
        accept=".pdf,.docx,.doc" 
        onChange={(e) => uploadingJobId && handleFileUpload(e, uploadingJobId)}
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Job Postings</h1>
          <p className="text-muted-foreground mt-1">Manage your active roles and AI screening workflows.</p>
          
          <div className="flex bg-muted/50 p-1 rounded-none w-fit mt-6 border border-border/50">
            <button
              onClick={() => setActiveTab('active')}
              className={cn(
                "px-6 py-2 text-sm font-black rounded-none transition-all",
                activeTab === 'active' ? "bg-white text-primary shadow-none border border-slate-100" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Active Roles
            </button>
            <button
              onClick={() => setActiveTab('draft')}
              className={cn(
                "px-6 py-2 text-sm font-black rounded-none transition-all",
                activeTab === 'draft' ? "bg-white text-primary shadow-none border border-slate-100" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Drafts
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isCreateOpen} onOpenChange={(open) => { 
            if (!open && !isSubmitting) {
              // Auto-save to database draft when closing if there's content
              if (title.trim() || requirements.trim()) {
                handleCreateOrEditJob(null, 'draft');
              } else {
                resetForm();
              }
            }
            setIsCreateOpen(open); 
          }}>
            <DialogTrigger render={
              <Button 
                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-11 px-6 rounded-xl font-bold relative"
                onClick={() => {
                  if (!isCreateOpen) {
                    if (!hasUnsavedChanges) {
                      resetForm();
                    } else {
                      loadLocalDraft();
                    }
                  }
                }}
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New Role
                {hasUnsavedChanges && !editingJobId && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[8px] items-center justify-center text-white font-black">!</span>
                  </span>
                )}
              </Button>
            } />
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <DialogTitle className="text-2xl font-black flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Create New Role
                  </DialogTitle>
                  <DialogDescription>
                    Define the role details to help AI screen candidates accurately.
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => handleCreateOrEditJob(e as any, 'draft')}
                    className="text-primary hover:text-primary hover:bg-primary/5 font-black h-8 px-3 rounded-full uppercase tracking-tighter text-[10px]"
                  >
                    Save Draft
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handleCreateOrEditJob} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="font-bold">Job Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="h-11 border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type" className="font-bold">Position Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type" className="h-11 border-border">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job">Full-time Job</SelectItem>
                      <SelectItem value="part-time">Part-time Job</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="font-bold">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Kigali, Rwanda (or Remote)"
                  className="h-11 border-border"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements" className="font-bold">Key Requirements</Label>
                <Textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="What are the main responsibilities and requirements?"
                  className="h-32 border-border resize-none"
                  required
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="skills" className="font-bold">Required Skills (Comma separated)</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchRecommendedSkills}
                    disabled={isGeneratingSkills || !title}
                    className="h-7 text-[10px] font-black uppercase tracking-wider bg-primary/5 text-primary hover:bg-primary/10 rounded-full px-3"
                  >
                    {isGeneratingSkills ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Suggest Skills
                  </Button>
                </div>
                <Input
                  id="skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. React, TypeScript, Node.js"
                  className="h-11 border-border"
                  required
                />
                
                {recommendedSkills.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">AI Recommendations (Click to add)</p>
                    <div className="flex flex-wrap gap-2">
                      {recommendedSkills.map((skill, index) => {
                        const isSelected = skills.split(',').map(s => s.trim().toLowerCase()).includes(skill.toLowerCase());
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={cn(
                              "px-3 py-1 text-xs font-bold rounded-full transition-all border",
                              isSelected 
                                ? "bg-primary text-white border-primary shadow-sm" 
                                : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent"
                            )}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="experience" className="font-bold">Experience Level</Label>
                  <Input
                    id="experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 5+ years"
                    className="h-11 border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryRange" className="font-bold">Salary Range</Label>
                  <Input
                    id="salaryRange"
                    value={salaryRange || ''}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    placeholder="e.g. $50k - $80k"
                    className="h-11 border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="passingScore" className="font-bold">Passing Score (/100)</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    min="0"
                    max="100"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="h-11 border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="font-bold">Application Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="h-11 border-border"
                    required
                  />
                </div>
              </div>
              <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isSubmitting} 
                  className="w-full h-11 text-lg font-bold border-slate-200 hover:bg-slate-50"
                  onClick={(e) => handleCreateOrEditJob(e as any, 'draft')}
                >
                  Save as Draft
                </Button>
                <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-lg font-bold">
                  {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</> : 'Create Role'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Edit Role</DialogTitle>
              <DialogDescription>
                Update details for this role.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateOrEditJob} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-title" className="font-bold">Job Title</Label>
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="h-11 border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type" className="font-bold">Position Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="edit-type" className="h-11 border-border">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job">Full-time Job</SelectItem>
                      <SelectItem value="part-time">Part-time Job</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-requirements" className="font-bold">Key Requirements</Label>
                <Textarea
                  id="edit-requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="What are the main responsibilities and requirements?"
                  className="h-32 border-border resize-none"
                  required
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-skills" className="font-bold">Required Skills (Comma separated)</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchRecommendedSkills}
                    disabled={isGeneratingSkills || !title}
                    className="h-7 text-[10px] font-black uppercase tracking-wider bg-primary/5 text-primary hover:bg-primary/10 rounded-full px-3"
                  >
                    {isGeneratingSkills ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Suggest Skills
                  </Button>
                </div>
                <Input
                  id="edit-skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. React, TypeScript, Node.js"
                  className="h-11 border-border"
                  required
                />
                
                {recommendedSkills.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">AI Recommendations (Click to add)</p>
                    <div className="flex flex-wrap gap-2">
                      {recommendedSkills.map((skill, index) => {
                        const isSelected = skills.split(',').map(s => s.trim().toLowerCase()).includes(skill.toLowerCase());
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={cn(
                              "px-3 py-1 text-xs font-bold rounded-full transition-all border",
                              isSelected 
                                ? "bg-primary text-white border-primary shadow-sm" 
                                : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent"
                            )}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-experience" className="font-bold">Experience Level</Label>
                  <Input
                    id="edit-experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 5+ years"
                    className="h-11 border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-passingScore" className="font-bold">Passing Score (/100)</Label>
                  <Input
                    id="edit-passingScore"
                    type="number"
                    min="0"
                    max="100"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="h-11 border-border"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-deadline" className="font-bold">Application Deadline</Label>
                <Input
                  id="edit-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-11 border-border"
                  required
                />
              </div>
              <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isSubmitting} 
                  className="w-full h-11 text-lg font-bold border-slate-200 hover:bg-slate-50"
                  onClick={(e) => handleCreateOrEditJob(e as any, 'draft')}
                >
                  Save as Draft
                </Button>
                <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-lg font-bold">
                  {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Updating...</> : (editingJobId && jobs.find(j => j.id === editingJobId)?.status === 'draft' ? 'Publish Role' : 'Save Changes')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteJob}
        title="Delete Job Posting"
        description="Are you sure you want to delete this job? This will also remove all associated screening data. This action cannot be undone."
        isLoading={isDeleting}
      />

      <DeleteConfirmationDialog
        isOpen={isClearDraftsDialogOpen}
        onOpenChange={setIsClearDraftsDialogOpen}
        onConfirm={confirmClearAllDrafts}
        title="Clear All Drafts"
        description={`Are you sure you want to delete all ${jobs.filter(j => j.status === 'draft').length} drafts? This action cannot be undone.`}
        isLoading={isDeleting}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search roles or skills..."
              className="pl-10 h-12 border-border shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === 'draft' && jobs.some(j => j.status === 'draft') && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearAllDrafts}
              className="border-destructive/20 text-destructive hover:bg-destructive/5 font-black text-[10px] uppercase tracking-widest h-12 px-6 rounded-xl"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Drafts
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Fetching your roles...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-card rounded-2xl border border-dashed border-border shadow-sm"
        >
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">No roles found</h3>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            {searchQuery ? "Try adjusting your search terms." : "Get started by creating your first job posting to begin AI screening."}
          </p>
          {!searchQuery && (
            <div className="mt-8">
              <Button onClick={() => setIsCreateOpen(true)} className="h-11 px-8">
                <Plus className="mr-2 h-5 w-5" />
                Create First Job
              </Button>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredJobs.map((job) => (
            <motion.div key={job.id} variants={item}>
              <Card className="group overflow-hidden border border-slate-100 shadow-none hover:border-primary transition-all duration-300 h-full flex flex-col rounded-none bg-white">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-black group-hover:text-primary transition-colors line-clamp-1 leading-tight">
                      {job.title}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="shrink-0 h-7 w-7 flex items-center justify-center hover:bg-slate-100 rounded-none transition-colors">
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-none">
                        <DropdownMenuItem className="cursor-pointer text-sm" onClick={() => openEditDialog(job)}>
                          <Edit className="mr-2 h-3.5 w-3.5" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer text-sm" onClick={() => handleDeleteJob(job.id)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete Role
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-none bg-primary/10 text-primary">
                      {job.type === 'internship' ? 'Intern' : job.type === 'part-time' ? 'Part' : 'Full'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]">{job.location}</span>
                  </div>
                </CardHeader>
                <CardContent className="px-4 py-2 flex-grow space-y-3">
                  <div className="flex items-center justify-between text-[10px] py-2 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Exp</span>
                      <span className="font-black text-slate-900">{job.experience.replace(/[^0-9+]/g, '') || job.experience}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Target</span>
                      <span className="font-black text-emerald-600">{job.passingScore || 70}%</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                    {job.requirements}
                  </div>
                </CardContent>
                <CardFooter className="p-3 pt-0 mt-auto flex justify-between items-center bg-slate-50/50">
                  <span className="text-[9px] font-medium text-slate-400 italic">
                    Posted {format(new Date(job.createdAt), 'MMM d')}
                  </span>
                  <Link to={`/admin/jobs/${job.id}`}>
                    <Button variant="link" size="sm" className="h-7 p-0 text-[10px] font-black uppercase tracking-widest text-primary hover:no-underline flex items-center group/btn">
                      Manage <ChevronRight className="ml-0.5 h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

