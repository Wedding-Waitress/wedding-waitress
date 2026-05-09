import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Send, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useUserPlan } from '@/hooks/useUserPlan';
import { supabase } from '@/integrations/supabase/client';

const CATEGORIES = [
  'Report a Bug',
  'Request a Feature',
  'Billing Question',
  'Urgent Wedding Day Support',
  'General Help',
  'Technical Problem',
  'Account Access Issue',
  'SMS/Email Delivery Issue',
] as const;

type Category = (typeof CATEGORIES)[number];

const helpSchema = z.object({
  category: z.enum(CATEGORIES),
  fullName: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Valid email required').max(255),
  message: z.string().trim().min(1, 'Please describe your issue').max(2000),
});

interface GetHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GetHelpModal: React.FC<GetHelpModalProps> = ({ open, onOpenChange }) => {
  const { profile } = useProfile();
  const { plan } = useUserPlan();

  const [category, setCategory] = useState<Category | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'category' | 'fullName' | 'email' | 'message', string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const planDisplayName = useMemo(() => {
    const raw = plan?.plan_name?.trim();
    if (!raw || raw.toLowerCase() === 'starter' || raw.toLowerCase() === 'free') return 'Free';
    return raw;
  }, [plan?.plan_name]);

  // Smart-fill from profile/auth when modal opens
  useEffect(() => {
    if (!open) return;
    const f = profile?.first_name?.trim() || '';
    const l = profile?.last_name?.trim() || '';
    const composed = [f, l].filter(Boolean).join(' ');
    if (composed && !fullName) setFullName(composed);

    if (profile?.email && !email) {
      setEmail(profile.email);
    } else if (!email) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) setEmail((prev) => prev || data.user!.email!);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile?.first_name, profile?.last_name, profile?.email]);

  const reset = () => {
    setCategory(null);
    setMessage('');
    setErrors({});
  };

  const handleClose = () => {
    if (submitting) return;
    onOpenChange(false);
    // brief delay so closing animation feels clean
    setTimeout(reset, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!category) {
      setErrors({ category: 'Please choose a category' });
      return;
    }

    const result = helpSchema.safeParse({ category, fullName, email, message });
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof typeof errors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id ?? null;

      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'contact-form-message',
          recipientEmail: 'support@weddingwaitress.com.au',
          idempotencyKey: `support-${crypto.randomUUID()}`,
          templateData: {
            name: result.data.fullName,
            email: result.data.email,
            eventType: `Support Request — ${result.data.category}`,
            message:
              `[Support Category] ${result.data.category}\n` +
              `[Source] In-app Get Help modal\n` +
              `[User ID] ${userId ?? '—'}\n` +
              `[Plan] ${planDisplayName}\n\n` +
              result.data.message,
            date: new Date().toISOString(),
          },
        },
      });
      if (error) throw error;

      toast.success("Your support request has been sent. We'll reply within 24 hours.");
      onOpenChange(false);
      setTimeout(reset, 200);
    } catch (err) {
      console.error('Get Help submission failed', err);
      toast.error('Something went wrong. Please try again or email support@weddingwaitress.com.au');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DialogContent
        className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0"
      >
        {/* Header */}
        <div className="relative px-5 pt-6 pb-4 max-lg:pt-5 border-b border-border/50">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3 right-3 h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-[#F5F0EB] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-foreground text-center max-lg:mt-2">
            Get Help
          </h2>
          <p className="text-sm text-muted-foreground text-center mt-1">
            We typically reply within 24 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 max-lg:gap-5 space-y-5" noValidate>
          {/* Category selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              What do you need help with?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((c) => {
                const selected = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCategory(c);
                      if (errors.category) setErrors((e) => ({ ...e, category: undefined }));
                    }}
                    className={[
                      'lv-premium-shade min-h-11 px-3 py-2 rounded-full text-sm font-medium border transition-colors text-center',
                      selected
                        ? 'bg-[#967A59] text-white border-[#967A59]'
                        : 'bg-background text-foreground border-border hover:bg-[#F5F0EB]',
                    ].join(' ')}
                    aria-pressed={selected}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {errors.category && (
              <p className="text-xs text-destructive mt-1.5">{errors.category}</p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="help-fullname" className="block text-sm font-medium text-foreground mb-1.5">
              Full Name
            </label>
            <input
              id="help-fullname"
              type="text"
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
              className="w-full h-11 px-4 text-base rounded-xl border border-border bg-[#FAFAFA] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="Your name"
              aria-invalid={!!errors.fullName}
              required
            />
            {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="help-email" className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              id="help-email"
              type="email"
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="w-full h-11 px-4 text-base rounded-xl border border-border bg-[#FAFAFA] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              required
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          {/* Message */}
          <div>
            <label htmlFor="help-message" className="block text-sm font-medium text-foreground mb-1.5">
              How can we help?
            </label>
            <textarea
              id="help-message"
              maxLength={2000}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-3 text-base rounded-xl border border-border bg-[#FAFAFA] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              placeholder="Share as much detail as possible — links, screenshots in your reply email, event date, etc."
              aria-invalid={!!errors.message}
              required
            />
            {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 pt-2 max-lg:sticky max-lg:bottom-0 max-lg:bg-background max-lg:pb-1">
            <Button
              type="submit"
              disabled={submitting}
              className="lv-premium-shade flex-1 h-11 rounded-xl bg-[#967A59] text-white hover:bg-[#7e6749]"
            >
              {submitting ? 'Sending…' : (
                <>
                  Send Message
                  <Send className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
              className="lv-premium-shade flex-1 h-11 rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GetHelpModal;
