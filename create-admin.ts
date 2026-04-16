import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function createAdmin() {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, 'admin@umurava.africa', 'admin123456');
    console.log('Admin user created:', userCredential.user.uid);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
  process.exit(0);
}

createAdmin();
