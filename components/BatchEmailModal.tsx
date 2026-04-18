import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Send, Mail, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EmailJob {
  applicantId: string;
  name: string;
  email: string;
  body: string;
  subject: string;
  status: 'pending' | 'sending' | 'sent' | 'error';
  error?: string;
}

interface BatchEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: EmailJob[];
  onFinish?: () => void;
}

export function BatchEmailModal({ isOpen, onClose, emails: initialEmails, onFinish }: BatchEmailModalProps) {
  const [emails, setEmails] = useState<EmailJob[]>(initialEmails);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    setEmails(initialEmails);
  }, [initialEmails]);

  const sendEmail = async (index: number) => {
    const email = emails[index];
    if (email.status === 'sent') return;

    setEmails(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status: 'sending' };
      return next;
    });

    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email.email, subject: email.subject, body: email.body }),
      });

      if (res.ok) {
        setEmails(prev => {
          const next = [...prev];
          next[index] = { ...next[index], status: 'sent' };
          return next;
        });
        toast.success(`Email to ${email.name} sent`, {
          icon: <Mail className="h-4 w-4 text-emerald-500" />
        });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }
    } catch (error: any) {
      setEmails(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status: 'error', error: error.message };
        return next;
      });
      toast.error(`Failed to send email to ${email.name}`);
    }
  };

  const handleSendAll = async () => {
    setIsProcessing(true);
    for (let i = 0; i < emails.length; i++) {
      if (emails[i].status !== 'sent') {
        await sendEmail(i);
        // Add a small delay between emails
        await new Promise(r => setTimeout(r, 500));
      }
    }
    setIsProcessing(false);
    if (onFinish) onFinish();
  };

  const pendingCount = emails.filter(e => e.status !== 'sent').length;
  const sentCount = emails.filter(e => e.status === 'sent').length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 bg-slate-900 text-white">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black">Email Outreach Review</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium mt-1">
                Review {emails.length} drafted emails before sending.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex flex-col items-end">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Progress</span>
                <span className="text-xl font-black text-white">{sentCount}/{emails.length}</span>
               </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 bg-slate-50">
          <div className="space-y-6">
            {emails.map((email, idx) => (
              <div 
                key={email.applicantId} 
                className={cn(
                  "bg-white rounded-2xl border transition-all duration-300 overflow-hidden",
                  email.status === 'sent' ? "border-emerald-100 bg-emerald-50/10 opacity-70" : "border-slate-200 shadow-sm",
                  email.status === 'sending' && "border-primary ring-2 ring-primary/10 shadow-lg",
                  email.status === 'error' && "border-rose-200"
                )}
              >
                <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center font-black",
                      email.status === 'sent' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {email.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900">{email.name}</h4>
                      <p className="text-xs font-bold text-slate-500">{email.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {email.status === 'sent' ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Sent Successfully
                      </div>
                    ) : email.status === 'sending' ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Sending...
                      </div>
                    ) : email.status === 'error' ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Error: {email.error}
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 hover:text-primary"
                        onClick={() => sendEmail(idx)}
                        disabled={isProcessing}
                      >
                        <Send className="h-3.5 w-3.5 mr-2" />
                        Send Now
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-slate-50/30">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subject: {email.subject}</div>
                  <div className="text-sm text-slate-600 line-clamp-3 whitespace-pre-wrap italic">
                    {email.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 bg-white border-t flex items-center justify-between sm:justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isProcessing}
            className="rounded-xl font-bold text-slate-500"
          >
            {sentCount > 0 ? 'Close' : 'Review Later'}
          </Button>
          <div className="flex items-center gap-3">
             {pendingCount > 0 && (
               <Button 
                onClick={handleSendAll} 
                disabled={isProcessing}
                className="rounded-xl font-bold bg-primary hover:bg-primary/90 px-8 h-12 shadow-lg shadow-primary/20"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Batch...
                  </div>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send All {pendingCount} Emails
                  </>
                )}
              </Button>
             )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
