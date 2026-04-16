import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navigate, Link } from 'react-router-dom';
import { Briefcase, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a142f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-white/50 mt-4 animate-pulse font-medium">Authenticating...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await signInWithEmail(email, password);
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a142f] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse"></div>
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] right-[20%] w-1 h-1 rounded-full bg-white/40 shadow-[0_0_10px_white]"></div>
        <div className="absolute top-[40%] left-[30%] w-1.5 h-1.5 rounded-full bg-white/20"></div>
        <div className="absolute bottom-[30%] left-[15%] w-1 h-1 rounded-full bg-white/30"></div>
        <div className="absolute bottom-[20%] right-[30%] w-2 h-2 rounded-full bg-white/20"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-3xl mb-6 border border-primary/20 shadow-2xl shadow-primary/20"
          >
            <Briefcase className="h-10 w-10 text-primary" />
          </motion.div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Umurava Admin</h1>
          <p className="text-white/50 font-medium">AI-Powered Talent Screening Platform</p>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl rounded-[2rem] overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-primary to-blue-400" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Secure Access
            </CardTitle>
            <CardDescription className="text-white/40 font-medium">
              Sign in to manage your recruitment pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleEmailSignIn} className="space-y-5 mb-8">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70 text-xs font-black uppercase tracking-widest ml-1">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@umurava.africa" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70 text-xs font-black uppercase tracking-widest ml-1">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-black shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  <>
                    Sign in to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
            
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-[#111e42] px-4 text-white/30">
                  Or continue with
                </span>
              </div>
            </div>

            <Button 
              onClick={signInWithGoogle} 
              variant="outline" 
              className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 h-12 rounded-xl font-bold transition-all" 
              size="lg"
            >
              <svg className="mr-3 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Google Account
            </Button>
            
            <div className="mt-10 text-center">
              <Link to="/careers" className="inline-flex items-center text-sm font-bold text-primary hover:text-primary/80 transition-colors group">
                <Sparkles className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                View Careers Portal
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center mt-8 text-white/20 text-xs font-medium">
          &copy; {new Date().getFullYear()} Umurava. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

