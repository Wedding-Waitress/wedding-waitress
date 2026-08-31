/**
 * Stage 3 — Upgrade Plan Modal
 * Replaces the Stage 1 placeholder. Shows current plan + usage, lists higher-tier
 * upgrade options with "pay only the difference" pricing, and gently surfaces the
 * existing RSVP overage pack option when the user is approaching their guest cap.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, Users, Calendar, ArrowRight, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useEventLimits } from '@/hooks/useEventLimits';
import { useAccountSeats } from '@/hooks/useAccountSeats';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import {
  PLAN_REGISTRY,
  getPlanByName,
  type PlanKey,
} from '@/lib/planRegistry';
import { formatPrice } from '@/lib/currencyPricing';
import { RsvpOverageModal } from '@/components/Dashboard/RsvpOverageModal';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIER_RANK: Record<PlanKey, number> = {
  essential: 1,
  premium: 2,
  unlimited: 3,
  vendor_pro: 4,
};

export const UpgradePlanModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { plan } = useUserPlan();
  const { currency } = useCurrencyContext();
  const { includedEvents, additionalPurchased, currentEvents } = useEventLimits();
  const { usedSeats, maxSeats } = useAccountSeats();

  const [guestCount, setGuestCount] = useState<number>(0);
  const [overagePackGuests, setOveragePackGuests] = useState<number>(0);
  const [overageOpen, setOverageOpen] = useState(false);
  const [overageEventId, setOverageEventId] = useState<string | null>(null);

  const currentRegistry = getPlanByName(plan?.plan_name);
  const currentKey: PlanKey | null = currentRegistry?.key ?? null;
  const currentRank = currentKey ? TIER_RANK[currentKey] : 0;

  // Pull live guest + overage stats only when the modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ count: guests }, { data: overageRows }, { data: latestEvent }] = await Promise.all([
        supabase
          .from('guests')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('rsvp_invite_purchases')
          .select('overage_blocks')
          .eq('user_id', user.id)
          .eq('purchase_type', 'rsvp_overage')
          .eq('status', 'completed'),
        supabase
          .from('events')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setGuestCount(guests ?? 0);
      const totalBlocks = (overageRows ?? []).reduce(
        (sum: number, r: any) => sum + (r.overage_blocks ?? 0),
        0,
      );
      setOveragePackGuests(totalBlocks * 10);
      setOverageEventId((latestEvent as any)?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const guestLimit = currentRegistry?.limits.guests ?? plan?.guest_limit ?? null;
  const totalGuestCapacity = guestLimit != null ? guestLimit + overagePackGuests : null;
  const approachingCap =
    totalGuestCapacity != null && guestCount >= Math.max(1, Math.floor(totalGuestCapacity * 0.8));

  // Build the upgrade option list — strictly higher tiers only.
  const upgradeOptions = useMemo(() => {
    return (Object.values(PLAN_REGISTRY) as Array<typeof PLAN_REGISTRY[PlanKey]>).filter(
      (p) => TIER_RANK[p.key] > currentRank,
    );
  }, [currentRank]);

  const currentPlanPriceAud = currentKey
    ? PLAN_REGISTRY[currentKey].prices[currency]?.price ?? PLAN_REGISTRY[currentKey].prices.AUD.price
    : 0;

  const handleSelect = (targetKey: PlanKey) => {
    const isOneTimeUpgrade =
      currentKey &&
      currentRegistry?.mode === 'payment' &&
      PLAN_REGISTRY[targetKey].mode === 'payment';
    const fromParam = isOneTimeUpgrade ? `&from=${currentKey}` : '';
    onOpenChange(false);
    navigate(`/dashboard/upgrade/checkout?plan=${targetKey}${fromParam}`);
  };

  const renderCurrentPlanName = () => {
    if (!plan?.plan_name || /^(free|starter)$/i.test(plan.plan_name)) return 'Free Trial';
    return currentRegistry?.name ?? plan.plan_name;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 max-lg:max-w-[100vw] max-lg:rounded-none"
        >
          {/* Header — title centered (built-in DialogContent X handles close) */}
          <DialogHeader className="px-6 pt-12 pb-2 max-lg:px-4 max-lg:pt-12">
            <DialogTitle className="text-center text-xl font-semibold flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: '#967A59' }} />
              Upgrade your plan
            </DialogTitle>
            <p className="text-xs text-muted-foreground/80 text-center mt-1.5">
              Move up anytime — you'll only pay the difference between your current and new plan.
            </p>
          </DialogHeader>

          <div className="px-6 pb-6 pt-3 space-y-5 max-lg:px-4">
            {/* ── Current plan summary ────────────────────────────────── */}
            <section className="rounded-xl border border-[#E8E1D6]/70 bg-[#FBF9F4] p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80 font-medium">
                    Your current plan
                  </p>
                  <p className="text-base font-semibold text-foreground mt-0.5">
                    {renderCurrentPlanName()}
                  </p>
                </div>
                <Badge className="bg-[#F5F0EB] text-[#7d6649] border-[#E8E1D6] hover:bg-[#F5F0EB]">
                  Active
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5" style={{ color: '#967A59' }} />
                  <div>
                    <div className="text-muted-foreground text-xs">Events</div>
                    <div className="text-foreground font-medium">
                      {currentEvents} used · {includedEvents + additionalPurchased} allowed
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-0.5" style={{ color: '#967A59' }} />
                  <div>
                    <div className="text-muted-foreground text-xs">Guest capacity</div>
                    <div className="text-foreground font-medium">
                      {guestCount} used ·{' '}
                      {totalGuestCapacity != null ? `${totalGuestCapacity} allowed` : 'Unlimited'}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Users className="h-4 w-4 mt-0.5" style={{ color: '#967A59' }} />
                  <div>
                    <div className="text-muted-foreground text-xs">Account users</div>
                    <div className="text-foreground font-medium">
                      {usedSeats} / {maxSeats}
                    </div>
                  </div>
                </div>
              </div>

              {/* Positive helper — guest packs already owned */}
              {overagePackGuests > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#EFF7EE] border border-[#CDE5CB] px-3 py-2 text-xs text-[#3F6B3D]">
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    +{overagePackGuests} extra guests added via guest packs
                  </span>
                </div>
              )}
            </section>

            {/* ── Capacity helper banner (non-pushy) ──────────────────── */}
            {approachingCap && overageEventId && (
              <section className="rounded-xl border border-[#E8E1D6]/70 bg-white p-4">
                <p className="text-sm font-medium text-foreground">
                  Approaching your guest cap
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You have a couple of options — either works.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setOverageOpen(true)}
                    className="lv-premium-shade text-left rounded-lg border border-[#E8E1D6] bg-[#FBF9F4] hover:bg-[#F5F0EB] px-3 py-2.5 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Plus className="h-4 w-4" style={{ color: '#967A59' }} />
                      Add a guest pack
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      A$10 per 10 extra guests · pay once
                    </div>
                  </button>
                  <div className="rounded-lg border border-[#E8E1D6] bg-[#FBF9F4] px-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Sparkles className="h-4 w-4" style={{ color: '#967A59' }} />
                      Move up a plan
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Higher cap, only pay the difference
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Upgrade options ─────────────────────────────────────── */}
            {upgradeOptions.length === 0 ? (
              <section className="rounded-xl border border-[#E8E1D6]/70 bg-white p-6 text-center">
                <p className="text-sm font-medium text-foreground">You're on our top plan.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Thanks for being with Wedding Waitress.
                </p>
              </section>
            ) : (
              <section className="space-y-3">
                {upgradeOptions.map((p) => {
                  const cur = p.prices[currency] ?? p.prices.AUD;
                  const isSubscription = p.mode === 'subscription';
                  const fullPrice = cur.price;
                  const isOneTimeUpgrade =
                    !isSubscription && currentRegistry?.mode === 'payment';
                  const diff = isOneTimeUpgrade
                    ? Math.max(0, fullPrice - currentPlanPriceAud)
                    : fullPrice;
                  const showDiff = isOneTimeUpgrade && diff > 0 && diff < fullPrice;
                  const isPremium = p.key === 'premium';

                  return (
                    <div
                      key={p.key}
                      className={`relative rounded-xl border bg-white p-4 transition-all ${
                        isPremium
                          ? 'border-[#967A59]/50 shadow-[0_2px_12px_-4px_rgba(150,122,89,0.25)]'
                          : 'border-[#E8E1D6]/70'
                      }`}
                    >
                      {isPremium && (
                        <span className="absolute -top-2.5 right-4 text-[10px] tracking-wide uppercase font-medium px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#B8946A] to-[#967A59] text-white shadow-sm">
                          Most Popular
                        </span>
                      )}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.limits.guests == null
                              ? 'Unlimited guests'
                              : `Up to ${p.limits.guests} guests`}{' '}
                            · {p.limits.includedEvents} {p.limits.includedEvents === 1 ? 'event' : 'events'} included · {p.limits.maxUsers} users
                          </p>
                        </div>
                        <div className="text-right">
                          {showDiff ? (
                            <>
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                                You pay only
                              </div>
                              <div className="text-xl font-semibold text-foreground leading-tight">
                                {formatPrice(currency, diff)}
                              </div>
                              <div className="text-[11px] text-muted-foreground line-through">
                                {formatPrice(currency, fullPrice)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-xl font-semibold text-foreground leading-tight">
                                {formatPrice(currency, fullPrice)}
                                {isSubscription && (
                                  <span className="text-xs text-muted-foreground font-normal">
                                    {' '}/mo
                                  </span>
                                )}
                              </div>
                              {cur.originalPrice && (
                                <div className="text-[11px] text-muted-foreground line-through">
                                  {formatPrice(currency, cur.originalPrice)}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleSelect(p.key)}
                        size="sm"
                        className="lv-premium-shade w-full mt-4 bg-gradient-to-r from-[#B8946A] via-[#967A59] to-[#7d6649] hover:from-[#A88560] hover:via-[#7d6649] hover:to-[#6a5640] text-white rounded-full"
                      >
                        Continue to checkout
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {overageEventId && (
        <RsvpOverageModal
          isOpen={overageOpen}
          onClose={() => setOverageOpen(false)}
          eventId={overageEventId}
          currentGuestCount={guestCount}
          totalCapacity={totalGuestCapacity ?? guestCount}
          tierLabel={renderCurrentPlanName()}
        />
      )}
    </>
  );
};

export default UpgradePlanModal;
