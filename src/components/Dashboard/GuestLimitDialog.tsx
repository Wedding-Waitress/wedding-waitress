import {TrialLimitChoice}from'@/components/Subscription/TrialLimitChoice';
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/enhanced-button";
import { PartyPopper, AlertTriangle, Plus, Sparkles } from 'lucide-react';
import { guestPlanDisplayName } from '@/lib/guestEntitlement';

interface GuestLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  variant: 'congratulations' | 'exceeded';
  guestLimit: number;
  planName?: string | null;
  planGuestLimit?: number | null;
  isTrial?: boolean;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  onUpgradePlan?: () => void;
  onBuyCapacity?: () => void;
}

// Simple confetti particle component
const ConfettiParticle: React.FC<{ delay: number; left: number; color: string }> = ({ delay, left, color }) => (
  <div
    className="absolute w-2 h-2 rounded-full animate-confetti-fall"
    style={{
      left: `${left}%`,
      top: '-10px',
      backgroundColor: color,
      animationDelay: `${delay}s`,
    }}
  />
);

const CONFETTI_COLORS = ['#22c55e', '#a855f7', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'];

export const GuestLimitDialog: React.FC<GuestLimitDialogProps> = ({
  isOpen,
  onClose,
  variant,
  guestLimit,
  planName,
  planGuestLimit,
  isTrial = false,
  trialStartedAt,
  trialEndsAt,
  onUpgradePlan,
  onBuyCapacity,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && variant === 'congratulations') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, variant]);

  if(isTrial&&onUpgradePlan)return <TrialLimitChoice trialStartedAt={trialStartedAt} trialEndsAt={trialEndsAt} open={isOpen} onContinue={onClose} onChoosePackage={onUpgradePlan}/>;
  if (variant === 'congratulations') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="ww-table-limit-dialog ww-guest-list-typography max-w-md border-green-300 overflow-hidden">
          {/* Confetti overlay */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
              {Array.from({ length: 30 }).map((_, i) => (
                <ConfettiParticle
                  key={i}
                  delay={Math.random() * 2}
                  left={Math.random() * 100}
                  color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
                />
              ))}
            </div>
          )}
          <div className="relative z-20">
            <div className="bg-green-50 rounded-xl p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-100 rounded-full p-4 animate-bounce">
                  <PartyPopper className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-green-800">
                🎉 Congratulations!
              </h2>
              <p className="text-lg text-green-700 font-medium">
                You have reached your guest limit of {guestLimit}!
              </p>
              <p className="text-sm text-green-600">
                {onBuyCapacity
                  ? 'You can add more space in whole blocks of 10 guests for A$11 per block including GST.'
                  : <>If you want to add more guests, please change your guest limit in <span className="font-semibold">My Events</span>.</>}
              </p>
            </div>
            <DialogFooter className="mt-4 gap-2">
              {onBuyCapacity && <Button onClick={onBuyCapacity} className="bg-green-500 hover:bg-green-600 text-white rounded-full">
                <Plus className="mr-2 h-4 w-4" /> Add Guest Capacity
              </Button>}
              <Button onClick={onClose} className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full">
                Got it!
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Exceeded variant
  const displayPlanName = guestPlanDisplayName(planName);
  const includedGuests = planGuestLimit ?? guestLimit;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="ww-table-limit-dialog ww-guest-list-typography max-w-md border-red-300">
        <div className="bg-red-50 rounded-xl p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-red-100 rounded-full p-4">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-red-700">
            Guest Limit Reached
          </h2>
          <p className="text-base text-red-600">
            You&rsquo;re currently on the {isTrial ? displayPlanName : `${displayPlanName} plan`}, which includes up to {includedGuests} guests. You have reached your guest limit.
          </p>
        </div>
        <DialogFooter className="mt-4 gap-2 sm:flex-col">
          {onUpgradePlan && <Button onClick={onUpgradePlan} className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full">
            <Sparkles className="mr-2 h-4 w-4" /> Upgrade Plan &mdash; Pay Only the Difference
          </Button>}
          {isTrial
            ? onUpgradePlan && <Button variant="outline" onClick={onUpgradePlan} className="w-full rounded-full">View Plans</Button>
            : onBuyCapacity && <Button variant="outline" onClick={onBuyCapacity} className="w-full rounded-full">
                <Plus className="mr-2 h-4 w-4" /> Add 10 More Guests
              </Button>}
          <Button variant="ghost" onClick={onClose} className="w-full rounded-full">
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
