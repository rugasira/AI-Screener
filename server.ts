import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import nodemailer from 'nodemailer';
import { createRequire } from 'module';

let requireFunc: NodeRequire;
if (typeof require !== 'undefined') {
  requireFunc = require;
} else {
  // @ts-ignore
  requireFunc = createRequire(import.meta.url);
}
const pdfParse = requireFunc('pdf-parse');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const upload = multer({ 
  dest: path.join(process.cwd(), 'uploads/'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// In-memory database for the hackathon prototype
const db = {
  jobs: [] as any[],
  applicants: [] as any[],
  screenings: [] as any[],
};

// Initialize Gemini API inside routes

// --- API Routes ---

// Get all jobs
app.get('/api/jobs', (req, res) => {
  res.json(db.jobs);
});

// Create a job
app.post('/api/jobs', (req, res) => {
  const newJob = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() };
  db.jobs.push(newJob);
  res.status(201).json(newJob);
});

// Delete a job
app.delete('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  db.jobs = db.jobs.filter(j => j.id !== id);
  // Also delete associated screenings
  db.screenings = db.screenings.filter(s => s.jobId !== id);
  res.status(200).json({ message: 'Job deleted' });
});

// Update a job
app.put('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const index = db.jobs.findIndex(j => j.id === id);
  if (index !== -1) {
    db.jobs[index] = { ...db.jobs[index], ...req.body };
    res.status(200).json(db.jobs[index]);
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Get a single job
app.get('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const job = db.jobs.find(j => j.id === id);
  if (job) {
    res.json(job);
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Get all applicants
app.get('/api/applicants', (req, res) => {
  res.json(db.applicants);
});

// Apply for a job
app.post('/api/applicants/apply', (req, res, next) => {
  console.log('Incoming application request to /api/applicants/apply');
  upload.single('resume')(req, res, (err) => {
    if (err) {
      console.error('Multer error during application:', err);
      return res.status(400).json({ error: 'File upload failed', details: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { name, email, jobId, phone, education, reason, otherInfo } = req.body;
    const file = req.file;

    console.log('Processing application for:', { name, email, jobId });
    console.log('File details:', file ? { filename: file.filename, size: file.size, mimetype: file.mimetype } : 'No file');

    if (!name || !email || !jobId || !file) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let resumeText = '';
    if (file.mimetype === 'application/pdf') {
      try {
        console.log('Parsing PDF resume...');
        const dataBuffer = fs.readFileSync(file.path);
        
        if (typeof pdfParse !== 'function') {
          console.error('pdfParse is not a function. Type:', typeof pdfParse);
          throw new Error('PDF parser is not properly initialized');
        }

        const data = await pdfParse(dataBuffer);
        resumeText = data.text;
        console.log('PDF parsed successfully, length:', resumeText?.length);
        
        if (!resumeText || resumeText.trim().length === 0) {
          console.log('PDF parsing resulted in empty text');
          return res.status(400).json({ error: 'The uploaded PDF contains no readable text. Please ensure your PDF is text-based and not just scanned images.' });
        }
      } catch (err: any) {
        console.error('PDF parsing error:', err);
        return res.status(400).json({ error: 'Failed to read the PDF file: ' + (err.message || 'Unknown error') });
      }
    } else {
      console.log('Reading non-PDF resume...');
      resumeText = fs.readFileSync(file.path, 'utf8');
      if (!resumeText || resumeText.trim().length === 0) {
        console.log('Uploaded file is empty');
        return res.status(400).json({ error: 'The uploaded file is empty.' });
      }
    }

    const newApplicant = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      name,
      email,
      phone,
      education,
      reason,
      otherInfo,
      jobId,
      resumeText,
      status: 'pending',
      score: null,
      analysis: null,
      source: 'Careers Page',
      createdAt: new Date().toISOString(),
      appliedAt: new Date().toISOString()
    };

    db.applicants.push(newApplicant);
    console.log('Application saved successfully. Total applicants:', db.applicants.length);
    
    // Clean up uploaded file
    if (file && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log('Temporary file deleted:', file.path);
      } catch (unlinkErr) {
        console.error('Error deleting temporary file:', unlinkErr);
      }
    }

    res.status(201).json(newApplicant);
  } catch (error: any) {
    console.error('Error processing application:', error);
    
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {}
    }

    res.status(500).json({ error: 'Failed to process application', details: error.message });
  }
});

// Delete an applicant
app.delete('/api/applicants/:id', (req, res) => {
  const { id } = req.params;
  db.applicants = db.applicants.filter(a => a.id !== id);
  res.status(200).json({ message: 'Applicant deleted' });
});

// Upload applicants (CSV or PDF)
app.post('/api/applicants/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { jobId } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const newApplicants: any[] = [];

    for (const file of files) {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        // Parse CSV
        const results: any[] = [];
        await new Promise((resolve, reject) => {
          fs.createReadStream(file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
        });
        
        results.forEach(row => {
          newApplicants.push({
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            name: row.name || row.Name || 'Unknown',
            email: row.email || row.Email || '',
            jobId: jobId || row.jobId || row.JobId || null,
            profileData: row,
            source: 'CSV',
            createdAt: new Date().toISOString()
          });
        });
      } else if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
        // Parse PDF
        try {
          const dataBuffer = fs.readFileSync(file.path);
          const data = await pdfParse(dataBuffer);
          const text = data.text;
          
          if (!text || text.trim().length === 0) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: `The uploaded PDF (${file.originalname}) contains no readable text. Please ensure your PDF is text-based and not just scanned images.` });
          }
          
          // Extract a name (very basic heuristic for prototype)
          const textLines = text.split('\n').filter((line: string) => line.trim().length > 0);
          const name = textLines.length > 0 ? textLines[0].trim() : file.originalname;

          // Extract email using regex
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
          const emailMatch = text.match(emailRegex);
          const email = emailMatch ? emailMatch[0] : '';

          newApplicants.push({
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            name: name,
            email: email,
            jobId: jobId || null,
            profileData: { resumeText: text },
            source: 'PDF',
            fileName: file.originalname,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          console.error('PDF parsing error in upload:', err);
          fs.unlinkSync(file.path);
          return res.status(400).json({ error: `Failed to read the PDF file (${file.originalname}). The file might be corrupted, password-protected, or in an unsupported format.` });
        }
      }
      
      // Clean up uploaded file
      fs.unlinkSync(file.path);
    }

    db.applicants.push(...newApplicants);
    res.status(201).json({ message: `Successfully processed ${newApplicants.length} applicants`, applicants: newApplicants });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process uploads' });
  }
});

// Save screening results
app.post('/api/screenings', async (req, res) => {
  try {
    const { jobId, results, applicantIds } = req.body;
    
    const applicantsToScreen = db.applicants.filter(a => applicantIds.includes(a.id));

    const screeningRecord = {
      id: Date.now().toString(),
      jobId,
      createdAt: new Date().toISOString(),
      results: results.map((res: any) => ({
        ...res,
        applicant: applicantsToScreen.find(a => a.id === res.applicantId)
      }))
    };

    db.screenings.push(screeningRecord);

    res.json(screeningRecord);
  } catch (error) {
    console.error('Save screening error:', error);
    res.status(500).json({ error: 'Failed to save screening results' });
  }
});

// Get screening results for a job
app.get('/api/screenings/:jobId', (req, res) => {
  const screenings = db.screenings.filter(s => s.jobId === req.params.jobId);
  res.json(screenings);
});

// Send email
app.post('/api/emails/send', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    const info = await transporter.sendMail({
      from: '"Umurava AI Screener" <no-reply@umurava.ai>',
      to: to,
      subject: subject,
      text: body,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", previewUrl);

    res.json({ success: true, previewUrl });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
