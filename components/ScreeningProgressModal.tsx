import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Sparkles, Brain, Search, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScreeningProgressModalProps {
  isOpen: boolean;
  candidateCount: number;
}

const steps = [
  { icon: FileText, text: "Reading resumes and extracting data..." },
  { icon: Search, text: "Analyzing candidate experience and skills..." },
  { icon: Brain, text: "Comparing profiles against job requirements..." },
  { icon: Sparkles, text: "Generating match scores and recommendations..." },
  { icon: CheckCircle2, text: "Finalizing screening reports..." }
];

export function ScreeningProgressModal({ isOpen, candidateCount }: ScreeningProgressModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[450px] rounded-3xl border-0 shadow-2xl p-0 overflow-hidden bg-white" showCloseButton={false}>
        <div className="bg-primary p-10 text-white relative overflow-hidden">
          {/* Animated background elements */}
          <motion.div 
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              rotate: -360,
              scale: [1, 1.3, 1],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl"
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md mb-6">
              <Sparkles className="h-10 w-10 text-white animate-pulse" />
            </div>
            <h2 className="text-3xl font-black tracking-tight mb-2">AI Screening</h2>
            <p className="text-primary-foreground/80 font-bold uppercase tracking-widest text-[10px]">
              Evaluating {candidateCount} Candidate{candidateCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="p-10 space-y-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 1.5, rotate: 20 }}
                    transition={{ duration: 0.5 }}
                  >
                    {React.createElement(steps[currentStep].icon, { className: "h-8 w-8 text-primary" })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="text-center h-12 flex items-center justify-center px-4">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-slate-600 font-bold text-lg leading-tight"
                >
                  {steps[currentStep].text}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
              <span>Progress</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
            <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
              Our AI is currently processing the resumes using deep analysis to find the best match for your role. This usually takes 10-20 seconds.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
