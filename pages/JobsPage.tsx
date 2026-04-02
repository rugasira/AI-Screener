import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MoreVertical, Briefcase, Calendar, Users, Wand2, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

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
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data);
    } catch (error) {
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
      const url = editingJobId ? `/api/jobs/${editingJobId}` : '/api/jobs';
      const method = editingJobId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, requirements, skills, experience, passingScore: parseInt(passingScore, 10), deadline }),
      });
      if (res.ok) {
        toast.success(editingJobId ? 'Job updated successfully' : 'Job created successfully');
        setIsCreateOpen(false);
        setIsEditOpen(false);
        fetchJobs();
        resetForm();
      } else {
        toast.error(editingJobId ? 'Failed to update job' : 'Failed to create job');
      }
    } catch (error) {
      toast.error(editingJobId ? 'Failed to update job' : 'Failed to create job');
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Job deleted successfully');
        fetchJobs();
      } else {
        toast.error('Failed to delete job');
      }
    } catch (error) {
      toast.error('Failed to delete job');
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
          "experience": "A short string describing the required experience level (e.g., '0-1 years' for internship, '3-5 years' for mid-level)."
        }
        
        Only return the JSON object, no markdown formatting or other text.
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">Manage job postings and screen applicants.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Add details for the new role to help AI screen candidates accurately.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateOrEditJob}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Senior Frontend Engineer"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Position Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger id="type">
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
                    variant="secondary" 
                    size="sm" 
                    onClick={handleGenerateWithAI}
                    disabled={isGenerating || !title}
                    className="bg-purple-100 text-purple-700 hover:bg-purple-200"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Generating...' : 'Auto-generate Details'}
                  </Button>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requirements">Key Requirements</Label>
                  <Textarea
                    id="requirements"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="What are the main responsibilities and requirements?"
                    className="h-24"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="skills">Required Skills</Label>
                  <Input
                    id="skills"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. React, TypeScript, Node.js"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="experience">Experience Level</Label>
                    <Input
                      id="experience"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="e.g. 5+ years"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="passingScore">Passing Score (/100)</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      min="0"
                      max="100"
                      value={passingScore}
                      onChange={(e) => setPassingScore(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deadline">Application Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Role</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update details for this role.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateOrEditJob}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-title">Job Title</Label>
                    <Input
                      id="edit-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Senior Frontend Engineer"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-type">Position Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger id="edit-type">
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
                    variant="secondary" 
                    size="sm" 
                    onClick={handleGenerateWithAI}
                    disabled={isGenerating || !title}
                    className="bg-purple-100 text-purple-700 hover:bg-purple-200"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Generating...' : 'Auto-generate Details'}
                  </Button>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-requirements">Key Requirements</Label>
                  <Textarea
                    id="edit-requirements"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="What are the main responsibilities and requirements?"
                    className="h-24"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-skills">Required Skills</Label>
                  <Input
                    id="edit-skills"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. React, TypeScript, Node.js"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-experience">Experience Level</Label>
                    <Input
                      id="edit-experience"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="e.g. 5+ years"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-passingScore">Passing Score (/100)</Label>
                    <Input
                      id="edit-passingScore"
                      type="number"
                      min="0"
                      max="100"
                      value={passingScore}
                      onChange={(e) => setPassingScore(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-deadline">Application Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search jobs..."
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed">
          <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No jobs</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new job posting.</p>
          <div className="mt-6">
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-xl line-clamp-1">{job.title}</CardTitle>
                    <span className="inline-flex items-center w-fit rounded-full bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 uppercase tracking-wider">
                      {job.type === 'internship' ? 'Internship' : job.type === 'part-time' ? 'Part-time Job' : 'Full-time Job'}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mt-2 -mr-2">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(job)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Job
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer" onClick={() => handleDeleteJob(job.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Job
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    Posted: {format(new Date(job.createdAt), 'MMM d, yyyy')}
                  </div>
                  {job.deadline && (
                    <div className="flex items-center text-orange-600 font-medium">
                      <Calendar className="mr-1 h-3 w-3" />
                      Deadline: {format(new Date(job.deadline), 'MMM d, yyyy')} 
                      {differenceInDays(new Date(job.deadline), new Date()) > 0 
                        ? ` (${differenceInDays(new Date(job.deadline), new Date())} days left)`
                        : ' (Expired)'}
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {job.requirements}
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.skills.split(',').slice(0, 3).map((skill: string, i: number) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {skill.trim()}
                    </span>
                  ))}
                  {job.skills.split(',').length > 3 && (
                    <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                      +{job.skills.split(',').length - 3} more
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t bg-gray-50/50 flex justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="mr-1 h-4 w-4" />
                  <span>Screening</span>
                </div>
                <Button nativeButton={false} render={<Link to={`/jobs/${job.id}`} />} variant="secondary" size="sm">
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
