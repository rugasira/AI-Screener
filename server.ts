import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import csv from 'csv-parser';
import { PDFParse } from 'pdf-parse';
import nodemailer from 'nodemailer';

const app = express();
const PORT = 3000;

app.use(express.json());

const upload = multer({ dest: 'uploads/' });

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
app.post('/api/applicants/apply', upload.single('resume'), async (req, res) => {
  try {
    const { name, email, jobId } = req.body;
    const file = req.file;

    if (!name || !email || !jobId || !file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let resumeText = '';
    if (file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(file.path);
      const pdfData = await PDFParse(dataBuffer);
      resumeText = pdfData.text;
    } else {
      resumeText = fs.readFileSync(file.path, 'utf8');
    }

    const newApplicant = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      name,
      email,
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
    res.status(201).json(newApplicant);
  } catch (error) {
    console.error('Error processing application:', error);
    res.status(500).json({ error: 'Failed to process application' });
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
            profileData: row,
            source: 'CSV',
            createdAt: new Date().toISOString()
          });
        });
      } else if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
        // Parse PDF
        const dataBuffer = fs.readFileSync(file.path);
        const pdfParser = new PDFParse({ data: dataBuffer });
        const textResult = await pdfParser.getText();
        const data = { text: textResult.text };
        
        // Extract a name (very basic heuristic for prototype)
        const textLines = data.text.split('\n').filter(line => line.trim().length > 0);
        const name = textLines.length > 0 ? textLines[0].trim() : file.originalname;

        // Extract email using regex
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const emailMatch = data.text.match(emailRegex);
        const email = emailMatch ? emailMatch[0] : '';

        newApplicants.push({
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          name: name,
          email: email,
          profileData: { resumeText: data.text },
          source: 'PDF',
          fileName: file.originalname,
          createdAt: new Date().toISOString()
        });
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
