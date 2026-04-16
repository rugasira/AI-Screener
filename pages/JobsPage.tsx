import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bulkFileInputRef = React.useRef<HTMLInputElement>(null);
  const bulkFolderInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('job');
  const [requirements, setRequirements] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [passingScore, setPassingScore] = useState('70');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

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
    setType(job.type);
    setRequirements(job.requirements);
    setSkills(job.skills);
    setExperience(job.experience);
    setPassingScore(job.passingScore?.toString() || '70');
    setDeadline(job.deadline || '');
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setTitle('');
    setType('job');
    setRequirements('');
    setSkills('');
    setExperience('');
    setPassingScore('70');
    setDeadline('');
    setEditingJobId(null);
  };

  const handleCreateOrEditJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const jobData = {
        title,
        type,
        requirements,
        skills,
        experience,
        passingScore: parseInt(passingScore, 10),
        deadline,
        createdAt: editingJobId ? jobs.find(j => j.id === editingJobId).createdAt : new Date().toISOString()
      };

      if (editingJobId) {
        await updateDoc(doc(db, 'jobs', editingJobId), jobData);
        toast.success('Job updated successfully');
      } else {
        const newJobRef = doc(collection(db, 'jobs'));
        await setDoc(newJobRef, { id: newJobRef.id, ...jobData });
        toast.success('Job created successfully');
      }

      setIsCreateOpen(false);
      setIsEditOpen(false);
      fetchJobs();
      resetForm();
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error(editingJobId ? 'Failed to update job' : 'Failed to create job');
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

  const handleGenerateWithAI = async () => {
    if (!title) {
      toast.error('Please enter a title first to generate details.');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `
        You are an expert technical recruiter and HR manager.
        I need to write a job description for a "${title}" position.
        The position type is: ${type === 'internship' ? 'Internship' : type === 'part-time' ? 'Part-time Job' : 'Full-time Job'}.
        
        Please generate the following details in JSON format:
        {
          "requirements": "A concise paragraph or bullet points describing the main responsibilities and requirements.",
          "skills": "A comma-separated list of 5-8 key skills required.",
          "experience": "A short string describing the required experience level."
        }
        
        Only return the JSON object, no markdown formatting.
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const resultText = response.text || '';
      const generatedData = JSON.parse(resultText);
      setRequirements(generatedData.requirements || '');
      setSkills(generatedData.skills || '');
      setExperience(generatedData.experience || '');
      toast.success('Details generated successfully!');
    } catch (error) {
      console.error('AI Generation error:', error);
      toast.error('Failed to generate details with AI.');
    } finally {
      setIsGenerating(false);
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

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.skills.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Job Postings</h1>
          <p className="text-muted-foreground mt-1">Manage your active roles and AI screening workflows.</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger render={
              <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-11 px-6 rounded-xl font-bold">
                <Plus className="mr-2 h-5 w-5" />
                Create New Role
              </Button>
            } />
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Create New Role</DialogTitle>
              <DialogDescription>
                Define the role details to help AI screen candidates accurately.
              </DialogDescription>
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
              
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateWithAI}
                  disabled={isGenerating || !title}
                  className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Auto-generate with AI'}
                </Button>
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
              <div className="space-y-2">
                <Label htmlFor="skills" className="font-bold">Required Skills (Comma separated)</Label>
                <Input
                  id="skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. React, TypeScript, Node.js"
                  className="h-11 border-border"
                  required
                />
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
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-11 text-lg font-bold">Create Role</Button>
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
              
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateWithAI}
                  disabled={isGenerating || !title}
                  className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Auto-generate with AI'}
                </Button>
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
              <div className="space-y-2">
                <Label htmlFor="edit-skills" className="font-bold">Required Skills (Comma separated)</Label>
                <Input
                  id="edit-skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. React, TypeScript, Node.js"
                  className="h-11 border-border"
                  required
                />
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
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-11 text-lg font-bold">Save Changes</Button>
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

      <div className="flex items-center space-x-4">
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
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredJobs.map((job) => (
            <motion.div key={job.id} variants={item}>
              <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                <div className="h-1.5 w-full bg-primary/20 group-hover:bg-primary transition-colors" />
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                      <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors line-clamp-1">
                        {job.title}
                      </CardTitle>
                      <span className="inline-flex items-center w-fit rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary border border-primary/20 uppercase tracking-widest">
                        {job.type === 'internship' ? 'Internship' : job.type === 'part-time' ? 'Part-time' : 'Full-time'}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="-mt-2 -mr-2 hover:bg-muted rounded-full h-8 w-8 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors">
                        <MoreVertical className="h-5 w-5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => openEditDialog(job)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer py-2.5" onClick={() => handleDeleteJob(job.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Role
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="flex flex-col gap-2 mt-4">
                    <div className="flex items-center text-xs font-medium">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      Posted {format(new Date(job.createdAt), 'MMM d, yyyy')}
                    </div>
                    {job.deadline && (
                      <div className={`flex items-center text-xs font-bold ${differenceInDays(new Date(job.deadline), new Date()) <= 3 ? 'text-destructive' : 'text-amber-600'}`}>
                        <Calendar className="mr-1.5 h-3.5 w-3.5" />
                        Deadline: {format(new Date(job.deadline), 'MMM d, yyyy')} 
                        <span className="ml-1 opacity-80">
                          ({differenceInDays(new Date(job.deadline), new Date()) > 0 
                            ? `${differenceInDays(new Date(job.deadline), new Date())}d left`
                            : 'Expired'})
                        </span>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-sm text-muted-foreground line-clamp-3 mb-6 leading-relaxed">
                    {job.requirements}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.split(',').slice(0, 4).map((skill: string, i: number) => (
                      <span key={i} className="bg-muted/50 text-muted-foreground text-[10px] font-bold px-2.5 py-1 rounded-md border border-border uppercase tracking-tighter">
                        {skill.trim()}
                      </span>
                    ))}
                    {job.skills.split(',').length > 4 && (
                      <span className="text-[10px] font-bold text-muted-foreground/60 px-1 py-1">
                        +{job.skills.split(',').length - 4} more
                      </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border bg-muted/20 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <Target className="h-4 w-4 text-primary" />
                    Score: {job.passingScore || 70}%
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/jobs/${job.id}`}>
                      <Button variant="ghost" size="sm" className="font-bold group-hover:text-primary group-hover:bg-primary/10 transition-all">
                        Manage
                        <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

