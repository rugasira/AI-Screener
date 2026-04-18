import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import nodemailer from 'nodemailer';
import { createRequire } from 'module';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc, query, where } from 'firebase/firestore';

import pdfParse from 'pdf-parse/lib/pdf-parse.js';

// Initialize Firebase
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let db: any;
let auth: any;
if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
  const firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(firebaseApp);
  
  // Authenticate backend as admin
  signInWithEmailAndPassword(auth, 'admin@umurava.africa', 'admin123456')
    .then(() => console.log('Backend authenticated as admin'))
    .catch(err => console.error('Backend auth failed:', err));
} else {
  console.warn('firebase-applet-config.json not found. Using in-memory fallback.');
  db = {
    jobs: [] as any[],
    applicants: [] as any[],
    screenings: [] as any[],
  };
}

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ 
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// --- Helper for Firestore ---
const isFirestore = (db: any) => typeof db.collection === 'function' || db.type === 'firestore' || db?.type === 'document' || db?.constructor?.name === 'Firestore' || (db && db._authCredentials);

// --- API Routes ---

// Get all jobs
app.get('/api/jobs', async (req, res) => {
  try {
    if (isFirestore(db)) {
      const snapshot = await getDocs(collection(db, 'jobs'));
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(jobs);
    } else {
      res.json(db.jobs);
    }
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Create a job
app.post('/api/jobs', async (req, res) => {
  try {
    const newJob = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() };
    if (isFirestore(db)) {
      await setDoc(doc(db, 'jobs', newJob.id), newJob);
    } else {
      db.jobs.push(newJob);
    }
    res.status(201).json(newJob);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Delete a job
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isFirestore(db)) {
      await deleteDoc(doc(db, 'jobs', id));
      // Also delete associated screenings
      const screeningsSnapshot = await getDocs(collection(db, 'screenings'));
      for (const sDoc of screeningsSnapshot.docs) {
        if (sDoc.data().jobId === id) {
          await deleteDoc(doc(db, 'screenings', sDoc.id));
        }
      }
    } else {
      db.jobs = db.jobs.filter((j: any) => j.id !== id);
      db.screenings = db.screenings.filter((s: any) => s.jobId !== id);
    }
    res.status(200).json({ message: 'Job deleted' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Update a job
app.put('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isFirestore(db)) {
      await updateDoc(doc(db, 'jobs', id), req.body);
      const updatedDoc = await getDoc(doc(db, 'jobs', id));
      res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
    } else {
      const index = db.jobs.findIndex((j: any) => j.id === id);
      if (index !== -1) {
        db.jobs[index] = { ...db.jobs[index], ...req.body };
        res.status(200).json(db.jobs[index]);
      } else {
        res.status(404).json({ error: 'Job not found' });
      }
    }
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Get a single job
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isFirestore(db)) {
      const jobDoc = await getDoc(doc(db, 'jobs', id));
      if (jobDoc.exists()) {
        res.json({ id: jobDoc.id, ...jobDoc.data() });
      } else {
        res.status(404).json({ error: 'Job not found' });
      }
    } else {
      const job = db.jobs.find((j: any) => j.id === id);
      if (job) {
        res.json(job);
      } else {
        res.status(404).json({ error: 'Job not found' });
      }
    }
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Get all applicants
app.get('/api/applicants', async (req, res) => {
  try {
    if (isFirestore(db)) {
      const snapshot = await getDocs(collection(db, 'applicants'));
      const applicants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(applicants);
    } else {
      res.json(db.applicants);
    }
  } catch (error) {
    console.error('Error fetching applicants:', error);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
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

        const data = await pdfParse(dataBuffer, {});
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

    if (isFirestore(db)) {
      await setDoc(doc(db, 'applicants', newApplicant.id), newApplicant);
      console.log('Application saved to Firestore successfully.');
    } else {
      db.applicants.push(newApplicant);
      console.log('Application saved successfully. Total applicants:', db.applicants.length);
    }
    
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
app.delete('/api/applicants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isFirestore(db)) {
      await deleteDoc(doc(db, 'applicants', id));
    } else {
      db.applicants = db.applicants.filter((a: any) => a.id !== id);
    }
    res.status(200).json({ message: 'Applicant deleted' });
  } catch (error) {
    console.error('Error deleting applicant:', error);
    res.status(500).json({ error: 'Failed to delete applicant' });
  }
});

// Upload applicants (CSV or PDF)
app.post('/api/applicants/upload', upload.array('resumes'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { jobId } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const newApplicants: any[] = [];

    // Pre-fetch existing applicants to check for duplicates in memory for performance
    let existingApplicants: any[] = [];
    if (isFirestore(db)) {
        const snapshot = await getDocs(collection(db, 'applicants'));
        existingApplicants = snapshot.docs.map(doc => doc.data());
    } else {
        existingApplicants = db.applicants;
    }

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
          const email = row.email || row.Email || '';
          if (!email) return;

          newApplicants.push({
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            name: row.name || row.Name || 'Unknown',
            email: email,
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
          const data = await pdfParse(dataBuffer, {});
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

          // Check if applicant already exists for this job
          let exists = false;
          if (isFirestore(db)) {
            const applicantsSnapshot = await getDocs(query(collection(db, 'applicants'), where('email', '==', email), where('jobId', '==', jobId)));
            if (!applicantsSnapshot.empty) exists = true;
          } else {
            exists = db.applicants.some((a: any) => a.email === email && a.jobId === jobId);
          }

          if (exists) {
            console.log(`Applicant with email ${email} already exists for job ${jobId}. Skipping.`);
            fs.unlinkSync(file.path);
            continue;
          }

          newApplicants.push({
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            name: name,
            email: email,
            phone: '',
            education: '',
            experience: '',
            skills: [],
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

    if (isFirestore(db)) {
      for (const applicant of newApplicants) {
        await setDoc(doc(db, 'applicants', applicant.id), applicant);
      }
    } else {
      db.applicants.push(...newApplicants);
    }
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
    
    let applicantsToScreen: any[] = [];
    if (isFirestore(db)) {
      const snapshot = await getDocs(collection(db, 'applicants'));
      applicantsToScreen = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((a: any) => applicantIds.includes(a.id));
    } else {
      applicantsToScreen = db.applicants.filter((a: any) => applicantIds.includes(a.id));
    }

    const screeningRecord = {
      id: Date.now().toString(),
      jobId,
      createdAt: new Date().toISOString(),
      results: results.map((res: any) => ({
        ...res,
        applicant: applicantsToScreen.find((a: any) => a.id === res.applicantId)
      }))
    };

    if (isFirestore(db)) {
      await setDoc(doc(db, 'screenings', screeningRecord.id), screeningRecord);
      // Update applicants status
      for (const result of results) {
        await updateDoc(doc(db, 'applicants', result.applicantId), {
          status: 'screened',
          score: result.matchScore,
          analysis: result.finalRecommendation
        });
      }
    } else {
      db.screenings.push(screeningRecord);
      // Update applicants status
      results.forEach((result: any) => {
        const applicant = db.applicants.find((a: any) => a.id === result.applicantId);
        if (applicant) {
          applicant.status = 'screened';
          applicant.score = result.matchScore;
          applicant.analysis = result.finalRecommendation;
        }
      });
    }

    res.json(screeningRecord);
  } catch (error) {
    console.error('Save screening error:', error);
    res.status(500).json({ error: 'Failed to save screening results' });
  }
});

// Get screening results for a job
app.get('/api/screenings/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    if (isFirestore(db)) {
      const snapshot = await getDocs(collection(db, 'screenings'));
      const screenings = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((s: any) => s.jobId === jobId);
      res.json(screenings);
    } else {
      const screenings = db.screenings.filter((s: any) => s.jobId === jobId);
      res.json(screenings);
    }
  } catch (error) {
    console.error('Error fetching screenings:', error);
    res.status(500).json({ error: 'Failed to fetch screenings' });
  }
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
