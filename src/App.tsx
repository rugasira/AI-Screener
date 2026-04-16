import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import DashboardLayout from '@/components/DashboardLayout';
import JobsPage from '@/pages/JobsPage';
import JobDetailsPage from '@/pages/JobDetailsPage';
import ScreeningPage from '@/pages/ScreeningPage';
import ApplicantsPage from '@/pages/ApplicantsPage';
import LoginPage from '@/pages/LoginPage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Simple admin check based on email
  const adminEmails = ['alexisahishakiye378@gmail.com', 'pine06858@gmail.com', 'admin@umurava.africa'];
  const isAdmin = user.email && adminEmails.includes(user.email);
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="bg-card p-8 rounded-lg shadow-md max-w-md w-full text-center border border-border">
          <h2 className="text-2xl font-bold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">You do not have administrator privileges to access this dashboard.</p>
          <button 
            onClick={async () => {
              const { auth } = await import('@/lib/firebase');
              await auth.signOut();
              window.location.href = '/login';
            }} 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign Out & Switch Account
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/*" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<JobsPage />} />
                  <Route path="/jobs/:id" element={<JobDetailsPage />} />
                  <Route path="/applicants" element={<ApplicantsPage />} />
                  <Route path="/screening/:jobId" element={<ScreeningPage />} />
                  <Route path="/screening/:jobId/:screeningId" element={<ScreeningPage />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}
