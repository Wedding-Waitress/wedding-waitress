import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Share2, Gift, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useReferral } from '@/hooks/useReferral';
import { useCredits, CreditTransaction } from '@/hooks/useCredits';

const KIND_LABELS: Record<string, string> = {
  welcome_bonus: 'Welcome bonus',
  referral_signup_bonus: 'Referral signup bonus',
  referral_reward: 'Referral reward',
  testimonial_reward: 'Testimonial reward',
  admin_bonus: 'Bonus credit',
  promotional_credit: 'Promotional bonus',
  manual_adjustment: 'Adjustment',
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const StatCard: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="rounded-xl border border-[#E8E1D6] bg-white/70 p-3 sm:p-4 text-center">
    <div className="text-2xl font-semibold" style={{ color: '#1D1D1F' }}>{value}</div>
    <div className="text-[11px] sm:text-xs mt-1 leading-tight" style={{ color: '#6E6E73' }}>{label}</div>
  </div>
);

export const ReferralRewardsModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const { code, link, stats, loading } = useReferral(open);
  const { balance, transactions } = useCredits(open);

  const creditsEarned = balance || stats.credits_earned;
  const allZero = stats.total === 0 && stats.signed_up === 0 && stats.pending === 0 && creditsEarned === 0;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error('Could not copy. Please copy manually.');
    }
  };

  const canShare = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';
  const onShare = async () => {
    if (!canShare || !link) return;
    try {
      await (navigator as any).share({
        title: 'Wedding Waitress',
        text: 'Join me on Wedding Waitress — the elegant way to plan your event.',
        url: link,
      });
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: '#F5EFE6' }}>
              <Gift className="h-5 w-5" style={{ color: '#967A59' }} />
            </span>
            <DialogTitle style={{ color: '#1D1D1F' }}>Referral / Affiliate Rewards</DialogTitle>
          </div>
          <DialogDescription className="pt-1" style={{ color: '#6E6E73' }}>
            Invite friends, venues, DJs, planners, and couples to Wedding Waitress and earn Wedding Waitress Credits.
          </DialogDescription>
        </DialogHeader>

        {/* Code */}
        <div className="rounded-xl border border-[#E8E1D6] p-4" style={{ backgroundColor: '#FBF7F1' }}>
          <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: '#6E6E73' }}>Your referral code</div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-0 text-lg sm:text-xl font-semibold tracking-wide break-all" style={{ color: '#967A59' }}>
              {loading && !code ? '…' : (code ?? '—')}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!code}
              onClick={() => code && copy(code, 'Referral code copied')}
              className="lv-premium-shade gap-1.5"
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>
        </div>

        {/* Link */}
        <div className="rounded-xl border border-[#E8E1D6] p-4 bg-white/70 mt-3">
          <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: '#6E6E73' }}>Your referral link</div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input readOnly value={link} className="text-sm break-all" />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!link}
                onClick={() => copy(link, 'Referral link copied')}
                className="lv-premium-shade gap-1.5 flex-1 sm:flex-none"
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
              {canShare && (
                <Button
                  size="sm"
                  disabled={!link}
                  onClick={onShare}
                  className="lv-premium-shade gap-1.5 flex-1 sm:flex-none"
                  style={{ backgroundColor: '#967A59', color: 'white' }}
                >
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard label="Total referrals" value={stats.total} />
            <StatCard label="Successful signups" value={stats.signed_up} />
            <StatCard label="Pending referrals" value={stats.pending} />
            <StatCard label="Credits earned" value={stats.credits_earned} />
          </div>
          {allZero && (
            <p className="text-xs text-center mt-3" style={{ color: '#6E6E73' }}>
              Start sharing your referral link to earn Wedding Waitress Credits.
            </p>
          )}
        </div>

        {/* Credits use cases */}
        <div className="mt-4 rounded-xl p-4 border border-[#E8E1D6]" style={{ backgroundColor: '#FBF7F1' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-4 w-4" style={{ color: '#967A59' }} />
            <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>Use Wedding Waitress Credits for</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#6E6E73' }}>
            SMS &amp; email credits · guest upgrades · premium features · printed products · invitations · place cards · QR signage.
          </p>
        </div>

        <p className="text-[11px] text-center mt-3" style={{ color: '#6E6E73' }}>
          More referral rewards and partner programs coming soon.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralRewardsModal;
