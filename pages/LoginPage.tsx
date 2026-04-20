import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navigate, Link } from 'react-router-dom';
import { Briefcase, Sparkles, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
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
      // More user-friendly error message for non-technical people
      const friendlyMessage = error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' 
        ? "The email or password you entered is incorrect. Please check your details and try again."
        : "We couldn't sign you in right now. Please verify your credentials or reach out to your administrator for help.";
      toast.error(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-white/10 blur-[120px] animate-pulse"></div>
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-white/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
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
            className="inline-flex items-center justify-center p-4 bg-white/10 rounded-3xl mb-6 border border-white/20 shadow-2xl"
          >
            <Briefcase className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Umurava Admin</h1>
          <p className="text-white/70 font-medium italic">Welcome back! Sign in to continue.</p>
        </div>

        <Card className="bg-white border-0 shadow-2xl rounded-[2rem] overflow-hidden">
          <div className="h-1.5 w-full bg-primary/20 group-hover:bg-primary transition-colors duration-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Secure Access
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Enter your credentials to access the screening portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleEmailSignIn} className="space-y-5 mb-8">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-500 text-xs font-black uppercase tracking-widest ml-1">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@umurava.africa" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-300 h-12 rounded-xl focus:ring-primary/20 focus:border-primary/20 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-500 text-xs font-black uppercase tracking-widest ml-1">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-50 border-slate-100 text-slate-900 h-12 rounded-xl focus:ring-primary/20 focus:border-primary/20 transition-all font-medium pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-black shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  <>
                    Access Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
            
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-white px-4 text-slate-400">
                  Or use social login
                </span>
              </div>
            </div>

            <Button 
              onClick={signInWithGoogle} 
              variant="outline" 
              className="w-full bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 h-12 rounded-xl font-bold transition-all" 
              size="lg"
            >
              <svg className="mr-3 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
旋        
        <p className="text-center mt-8 text-white/50 text-xs font-medium">
          &copy; {new Date().getFullYear()} Umurava. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

