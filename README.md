# Umurava Admin Portal

A modern recruitment portal for managing talent pipelines and job postings.

## Local Development Setup

Follow these steps to get the project running on your local machine:

### 1. Prerequisites
- **Node.js**: Ensure you have Node.js (v18 or higher) installed.
- **npm**: Standard Node Package Manager.

### 2. Clone the Repository
```bash
git clone <repository-url>
cd <project-folder>
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory and add your Firebase credentials and any other required keys:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_id
VITE_FIREBASE_APP_ID=your_app_id
```
*Note: Refer to `.env.example` for the full list of required variables.*

### 5. Start the Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000` (or the port specified in your console).

### 6. Build for Production
To create an optimized production build:
```bash
npm run build
```

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Backend/Database**: Firebase (Auth & Firestore)
- **UI Components**: Radix UI / Custom components
