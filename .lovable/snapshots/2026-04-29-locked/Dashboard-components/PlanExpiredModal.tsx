import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlanExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  trialExtended?: boolean;
}

export const PlanExpiredModal: React.FC<PlanExpiredModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  trialExtended = false,
}) => {
  const [extending, setExtending] = useState(false);
  const { toast } = useToast();

  const handleExtendTrial = async () => {
    setExtending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          trial_extended: true,
          status: 'active',
          is_read_only: false,
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Trial Extended",
        description: "Your trial has been extended by 7 days.",
      });
      onClose();
      window.location.reload();
    } catch (err) {
      console.error('Error extending trial:', err);
      toast({
        title: "Error",
        description: "Failed to extend trial. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExtending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <DialogTitle className="text-lg">Free Trial Expired</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Your 7-day free trial has ended. Upgrade to a paid plan to continue 
            managing your event with unlimited access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">With an upgraded plan you get:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Up to 100, 300, or unlimited guests</li>
              <li>• Unlimited tables & seating charts</li>
              <li>• QR code guest lookup</li>
              <li>• Place cards, dietary charts & more</li>
              <li>• 12-month access</li>
            </ul>
          </div>

          <div className="border rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Plans starting from</p>
            <p className="text-2xl font-bold text-primary">$99 AUD</p>
            <p className="text-xs text-muted-foreground">one-time payment</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-full">
            Maybe Later
          </Button>
          <Button
            onClick={onUpgrade}
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Choose a Plan
          </Button>
        </DialogFooter>

        {!trialExtended && (
          <div className="text-center pt-1 pb-2">
            <button
              onClick={handleExtendTrial}
              disabled={extending}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline-offset-2 hover:underline"
            >
              {extending ? "Extending..." : "Need more time?"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
