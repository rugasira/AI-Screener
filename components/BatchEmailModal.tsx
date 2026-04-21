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
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Send, Mail, X, Loader2, AlertCircle, Edit3 } from 'lucide-react';
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

  const handleBodyChange = (index: number, newBody: string) => {
    setEmails(prev => {
      const next = [...prev];
      next[index] = { ...next[index], body: newBody };
      return next;
    });
  };

  const pendingCount = emails.filter(e => e.status !== 'sent').length;
  const sentCount = emails.filter(e => e.status === 'sent').length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-white">
        <DialogHeader className="p-8 bg-primary text-white shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-3xl font-black tracking-tight">Outreach Campaign</DialogTitle>
              <DialogDescription className="text-white/80 font-bold mt-2">
                Review and distribute {emails.length} personalized outreach emails.
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end bg-black/10 p-4 rounded-2xl border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Success Rate</span>
              <span className="text-2xl font-black text-white">{sentCount} / {emails.length}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
          <ScrollArea className="flex-1 px-8 py-6">
            <div className="space-y-6 max-w-2xl mx-auto pb-12">
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
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject: {email.subject}</div>
                    {email.status !== 'sent' && (
                      <div className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest">
                        <Edit3 className="h-3 w-3" />
                        Editable Preview
                      </div>
                    )}
                  </div>
                  <Textarea 
                    value={email.body}
                    onChange={(e) => handleBodyChange(idx, e.target.value)}
                    disabled={email.status === 'sent' || isProcessing}
                    className={cn(
                      "text-sm text-slate-600 bg-white border-slate-200 rounded-xl min-h-[150px] resize-none focus:ring-primary/20",
                      email.status === 'sent' && "bg-transparent border-transparent italic text-slate-400 cursor-not-allowed shadow-none"
                    )}
                  />
                </div>
              </div>
            ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-8 bg-white border-t shrink-0 flex items-center justify-between sm:justify-between gap-6">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isProcessing}
            className="rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-colors h-14 px-8 uppercase tracking-widest text-[10px]"
          >
            {sentCount > 0 ? 'Finish Campaign' : 'Dismiss for Now'}
          </Button>
          <div className="flex items-center gap-4">
             {pendingCount > 0 && (
               <Button 
                onClick={handleSendAll} 
                disabled={isProcessing}
                className="rounded-2xl font-black bg-primary hover:bg-primary/90 px-10 h-14 shadow-2xl shadow-primary/30 uppercase tracking-widest text-[10px]"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Executing Batch...
                  </div>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-3" />
                    Deploy to all {pendingCount} Recipients
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
