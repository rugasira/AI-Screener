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
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await signUpWithEmail(email, password);
        toast.success('Account created successfully!');
      } else {
        await signInWithEmail(email, password);
        toast.success('Signed in successfully!');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let message = "We couldn't process your request right now.";
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.message?.includes('invalid-credential')) {
        message = "The email or password you entered is incorrect. Please check your details and try again.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered. Switching to Sign In instead.";
        setIsRegistering(false);
      } else if (error.code === 'auth/weak-password') {
        message = "Password is too weak. Please use at least 6 characters.";
      }
      
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements moved or lightened for white BG */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none text-slate-100 flex items-center justify-center opacity-40 select-none">
        <h2 className="text-[20vw] font-black tracking-tighter transform -rotate-12 translate-x-20">UMURAVA</h2>
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-[100px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-blue-50 blur-[120px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-none mb-6 shadow-none"
          >
            <Briefcase className="h-10 w-10 text-primary" />
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Umurava Admin</h1>
          <p className="text-slate-500 font-medium">Secure access to the recruitment portal.</p>
        </div>

        <Card className="bg-primary border-0 shadow-2xl rounded-none overflow-hidden text-white relative">
          {/* Dot pattern inside the card matching user request */}
          <div className="absolute inset-0 bg-dot-pattern text-white/20 pointer-events-none" />
          
          {/* Subtle gradient inside card for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80 pointer-events-none" />

          <CardHeader className="pb-2 pt-10 px-10 relative z-10">
            <CardTitle className="text-3xl font-black text-white flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-white" />
              {isRegistering ? 'Create Account' : 'Admin Login'}
            </CardTitle>
            <CardDescription className="text-white/70 font-medium mt-2">
              {isRegistering ? 'Join the recruiting team' : 'Log in to manage your talent pipeline'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-10 pb-12 relative z-10">
            <form onSubmit={handleAuth} className="space-y-6 mb-8">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white text-[10px] font-black uppercase tracking-widest ml-1">Email Address</Label>
                <Input 
                   id="email" 
                  type="email" 
                  placeholder="admin@umurava.africa" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-14 rounded-none focus:ring-white/20 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white text-[10px] font-black uppercase tracking-widest ml-1">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white h-14 rounded-none focus:ring-white/20 transition-all font-medium pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-white hover:bg-slate-50 text-primary h-14 rounded-none font-black shadow-lg shadow-black/10 transition-all active:scale-[0.98]" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    {isRegistering ? 'Creating...' : 'Verifying...'}
                  </div>
                ) : (
                  <>
                    {isRegistering ? 'Register Admin' : 'Sign In'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center mb-8">
              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs font-bold text-white/60 hover:text-white hover:underline transition-all"
              >
                {isRegistering ? 'Already have an account? Sign In' : 'New admin? Request Access / Sign Up'}
              </button>
            </div>
            
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-primary px-4 text-white/40">
                  Secure Credentials
                </span>
              </div>
            </div>

            <Button 
              onClick={signInWithGoogle} 
              variant="outline" 
              className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 h-14 rounded-none font-bold transition-all shadow-none" 
              size="lg"
            >
              <svg className="mr-3 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
        
        <p className="text-center mt-8 text-slate-400 text-xs font-medium">
          &copy; {new Date().getFullYear()} Umurava. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

