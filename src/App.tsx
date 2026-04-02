import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import DashboardLayout from '@/components/DashboardLayout';
import JobsPage from '@/pages/JobsPage';
import JobDetailsPage from '@/pages/JobDetailsPage';
import ApplicantsPage from '@/pages/ApplicantsPage';
import ScreeningPage from '@/pages/ScreeningPage';
import LoginPage from '@/pages/LoginPage';
import CareersPage from '@/pages/CareersPage';
import ApplyPage from '@/pages/ApplyPage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Simple admin check based on email
  const adminEmails = ['alexisahishakiye378@gmail.com', 'pine06858@gmail.com'];
  const isAdmin = user.email && adminEmails.includes(user.email);
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You do not have administrator privileges to access this dashboard.</p>
          <button 
            onClick={async () => {
              const { auth } = await import('@/lib/firebase');
              await auth.signOut();
              window.location.href = '/login';
            }} 
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
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
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/careers/:jobId/apply" element={<ApplyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
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
