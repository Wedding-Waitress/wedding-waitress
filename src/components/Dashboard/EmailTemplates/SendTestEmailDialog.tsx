import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, AlertCircle, Info } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

interface SendTestEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateHtml: string;
  templateName: string;
  eventId?: string | null;
  onSend: (recipientEmail: string) => Promise<boolean>;
}

export const SendTestEmailDialog: React.FC<SendTestEmailDialogProps> = ({
  open,
  onOpenChange,
  templateHtml,
  templateName,
  eventId,
  onSend,
}) => {
  const { profile } = useProfile();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill with user's profile email
  useEffect(() => {
    if (profile?.email) {
      setRecipientEmail(profile.email);
    }
  }, [profile]);

  // Reset error when email changes
  useEffect(() => {
    if (error) setError('');
  }, [recipientEmail]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSend = async () => {
    setError('');

    if (!recipientEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(recipientEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setSending(true);
    const success = await onSend(recipientEmail);
    setSending(false);

    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Send Test Email
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left pt-2">
            Send a test preview of this template to verify how it will appear in email clients before using it in your campaign.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="text-sm">
              <span className="text-muted-foreground">Template:</span>
              <span className="ml-2 font-medium">{templateName}</span>
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Send To</Label>
            <Input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={sending}
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Note:</strong> The test email will include sample guest data and a real QR code pointing to your event.
              The subject line will be prefixed with <strong>[TEST]</strong> for easy identification.
            </AlertDescription>
          </Alert>

          {/* Rate Limit Info */}
          <p className="text-xs text-muted-foreground text-center">
            Limited to 10 test emails per hour to prevent abuse
          </p>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !recipientEmail.trim()}
            className="bg-gradient-to-r from-primary to-purple-600"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
