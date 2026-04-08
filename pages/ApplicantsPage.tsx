import React, { useState, useEffect } from 'react';
import { Upload, FileText, Search, Trash2, User, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [applicantsRes, jobsRes] = await Promise.all([
        fetch('/api/applicants'),
        fetch('/api/jobs')
      ]);
      const applicantsData = await applicantsRes.json();
      const jobsData = await jobsRes.json();
      
      setApplicants(applicantsData);
      setJobs(jobsData);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteApplicant = async (id: string) => {
    try {
      const res = await fetch(`/api/applicants/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Applicant deleted successfully');
        fetchData();
      } else {
        toast.error('Failed to delete applicant');
      }
    } catch (error) {
      toast.error('Failed to delete applicant');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    if (selectedJobId !== 'all') {
      formData.append('jobId', selectedJobId);
    }

    try {
      setUploadError(null);
      const res = await fetch('/api/applicants/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        toast.success('Applicants uploaded successfully');
        setIsUploadOpen(false);
        setFiles(null);
        fetchData();
      } else {
        const data = await res.json();
        const errorMsg = data.error || 'Failed to upload applicants';
        setUploadError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      setUploadError('Upload failed. Please check your connection and try again.');
      toast.error('Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const filteredApplicants = selectedJobId === 'all' 
    ? applicants 
    : applicants.filter(a => a.jobId === selectedJobId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Applicants Pool</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all candidates across different jobs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger className={buttonVariants()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Resumes / CSV
            </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Upload Applicants</DialogTitle>
              <DialogDescription>
                Upload resumes (PDF) or a spreadsheet (CSV) containing applicant profiles.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload}>
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-500">PDF or CSV files</p>
                    </div>
                    <input 
                      id="dropzone-file" 
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept=".pdf,.csv"
                      onChange={(e) => setFiles(e.target.files)}
                    />
                  </label>
                </div>
                {files && files.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Selected {files.length} file(s):
                    <ul className="list-disc pl-5 mt-2">
                      {Array.from(files as FileList).map((file: File, i) => (
                        <li key={i} className="truncate">{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                    {uploadError}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!files || files.length === 0 || uploading}>
                  {uploading ? 'Uploading...' : 'Upload Files'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search applicants..."
            className="pl-8"
          />
        </div>
        <select 
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
        >
          <option value="all">All Jobs</option>
          {jobs.map(job => (
            <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </select>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Education</TableHead>
              <TableHead>Job Applied</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredApplicants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                  No applicants found. Upload some resumes to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredApplicants.map((applicant) => {
                const appliedJob = jobs.find(j => j.id === applicant.jobId);
                return (
                  <TableRow key={applicant.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <User className="h-4 w-4" />
                        </div>
                        {applicant.name}
                      </div>
                    </TableCell>
                    <TableCell>{applicant.email || 'N/A'}</TableCell>
                    <TableCell>{applicant.phone || 'N/A'}</TableCell>
                    <TableCell>{applicant.education || 'N/A'}</TableCell>
                    <TableCell>
                      {appliedJob ? (
                        <span className="font-medium text-sm text-gray-900">{appliedJob.title}</span>
                      ) : (
                        <span className="text-gray-400 italic">General / Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        {applicant.source}
                      </span>
                    </TableCell>
                    <TableCell>{format(new Date(applicant.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <FileText className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteApplicant(applicant.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
