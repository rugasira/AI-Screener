import React, { useState, useEffect } from 'react';
import { Upload, FileText, Search, Trash2, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/applicants');
      const data = await res.json();
      setApplicants(data);
    } catch (error) {
      toast.error('Failed to fetch applicants');
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
        fetchApplicants();
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

    try {
      const res = await fetch('/api/applicants/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        toast.success('Applicants uploaded successfully');
        setIsUploadOpen(false);
        setFiles(null);
        fetchApplicants();
      } else {
        toast.error('Failed to upload applicants');
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Applicants Pool</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all candidates across different jobs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchApplicants} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Resumes / CSV
              </Button>
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

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search applicants..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : applicants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                  No applicants found. Upload some resumes to get started.
                </TableCell>
              </TableRow>
            ) : (
              applicants.map((applicant) => (
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
