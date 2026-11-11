import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import {
  calculateExtensionTotalAud,
  ACCESS_EXTENSION_MAX_MONTHS,
  DEFAULT_EXTENSION_OPTIONS,
  isValidExtensionMonths,
  normalizePublicPlanName,
} from '@/lib/stripeExtensionPrices';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExtendPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  expiresAt: string;
}

export const ExtendPlanModal: React.FC<ExtendPlanModalProps> = ({
  isOpen,
  onClose,
  planName,
  expiresAt,
}) => {
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [customMonths, setCustomMonths] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const options = DEFAULT_EXTENSION_OPTIONS;
  const publicPlanName = normalizePublicPlanName(planName);
  const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const handleExtend = async () => {
    if (!isValidExtensionMonths(selectedMonths)) return;

    setLoading(true);
    try {
      const body = { extension_months: selectedMonths };

      const invokeAttempt = async () => {
        const { data, error } = await supabase.functions.invoke('create-extension-checkout', { body });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        return data;
      };

      // An uncertain response may already have created a session. Never retry blindly.
      const data = await invokeAttempt();

      if (data?.url) {
        try { sessionStorage.setItem('ww:returnTab', 'account'); } catch { /* storage may be unavailable */ }
        window.location.assign(data.url);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create checkout session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Extend Your {publicPlanName} Access
          </DialogTitle>
          <DialogDescription>
            Your account expires on <strong>{expiryDate}</strong>. Access costs A$22 per month including 10% GST and is paid upfront.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 mt-4">
          {options.map(option => {
            const isSelected = selectedMonths === option.months;
            return (
              <button
                key={option.months}
                onClick={() => setSelectedMonths(option.months)}
                className={`relative flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/40 bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-primary' : 'border-muted-foreground/40'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-medium text-sm">{option.label}</span>
                </div>
                <span className="font-bold text-sm">A${calculateExtensionTotalAud(option.months)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 space-y-2">
          <label htmlFor="custom-extension-months" className="text-sm font-medium">
            Or choose any number of whole months
          </label>
          <Input
            id="custom-extension-months"
            type="number"
            inputMode="numeric"
            min={1}
            max={ACCESS_EXTENSION_MAX_MONTHS}
            step={1}
            value={customMonths}
            placeholder="Enter months"
            onChange={(event) => {
              const value = event.target.value;
              setCustomMonths(value);
              const months = Number(value);
              if (isValidExtensionMonths(months)) setSelectedMonths(months);
            }}
          />
          <p className="text-xs text-muted-foreground">
            {selectedMonths} {selectedMonths === 1 ? 'month' : 'months'} · A${calculateExtensionTotalAud(selectedMonths)} including GST, paid once
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            onClick={handleExtend}
            disabled={!isValidExtensionMonths(selectedMonths) || loading}
            className="rounded-full"
          >
            {loading ? 'Processing...' : `Pay A$${calculateExtensionTotalAud(selectedMonths)} Now`}
          </Button>
          <Button variant="outline" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
