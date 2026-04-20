import React, { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PLAN_PRICES } from '@/lib/stripePrices';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PlanKey = 'essential' | 'premium' | 'unlimited';

const PLANS: Array<{
  key: PlanKey;
  name: string;
  price: number;
  description: string;
  highlight?: boolean;
  features: string[];
}> = [
  {
    key: 'essential',
    name: 'Essential',
    price: PLAN_PRICES.essential.price_aud,
    description: 'Perfect for intimate weddings up to 100 guests.',
    features: ['Up to 100 guests', 'All core tools', 'One-time payment'],
  },
  {
    key: 'premium',
    name: 'Premium',
    price: PLAN_PRICES.premium.price_aud,
    description: 'Most popular — ideal for mid-size weddings up to 300 guests.',
    highlight: true,
    features: ['Up to 300 guests', 'All core tools', 'One-time payment'],
  },
  {
    key: 'unlimited',
    name: 'Unlimited',
    price: PLAN_PRICES.unlimited.price_aud,
    description: 'No limits — for large weddings and grand celebrations.',
    features: ['Unlimited guests', 'All core tools', 'One-time payment'],
  },
];

export const UpgradePlanModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [busyKey, setBusyKey] = useState<PlanKey | null>(null);

  const handleChoose = async (key: PlanKey) => {
    setBusyKey(key);
    try {
      const plan = PLAN_PRICES[key];
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          price_id: plan.price_id,
          mode: 'payment',
          plan_type: key,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not start checkout',
        variant: 'destructive',
      });
      setBusyKey(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose your plan</DialogTitle>
          <DialogDescription>
            One-time payment. No subscription. Pick the plan that fits your wedding.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3 mt-2">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border bg-card p-5 flex flex-col ${
                plan.highlight
                  ? 'border-[#967A59] shadow-lg ring-1 ring-[#967A59]/30'
                  : 'border-border'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold rounded-full bg-[#967A59] text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                <span className="text-sm text-muted-foreground">AUD</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground min-h-[40px]">
                {plan.description}
              </p>
              <ul className="mt-3 space-y-1.5 text-sm flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-foreground">
                    <Check className="w-4 h-4 mt-0.5 text-[#967A59] flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleChoose(plan.key)}
                disabled={busyKey !== null}
                className="mt-5 w-full bg-[#967A59] hover:bg-[#7d6649] text-white rounded-full"
              >
                {busyKey === plan.key && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Choose Plan
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePlanModal;
