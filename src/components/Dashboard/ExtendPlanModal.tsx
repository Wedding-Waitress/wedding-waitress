import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Star } from 'lucide-react';
import { EXTENSION_PRICES, ExtensionOption } from '@/lib/stripeExtensionPrices';
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
  const [selectedMonths, setSelectedMonths] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const options: ExtensionOption[] = EXTENSION_PRICES[planName] || [];
  const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const handleExtend = async () => {
    const selected = options.find(o => o.months === selectedMonths);
    if (!selected) return;

    setLoading(true);
    try {
      const body = { price_id: selected.price_id, extension_months: selected.months };

      const invokeAttempt = async () => {
        const { data, error } = await supabase.functions.invoke('create-extension-checkout', { body });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        return data;
      };

      let data;
      try {
        data = await invokeAttempt();
      } catch {
        await new Promise(r => setTimeout(r, 2000));
        data = await invokeAttempt();
      }

      if (data?.url) {
        window.open(data.url, '_blank');
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
            Extend Your {planName} Plan
          </DialogTitle>
          <DialogDescription>
            Your account expires on <strong>{expiryDate}</strong>. Choose an extension duration below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 mt-4">
          {options.map(option => {
            const isSelected = selectedMonths === option.months;
            const isBestValue = option.months === 12;
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
                  {isBestValue && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                      <Star className="w-3 h-3 mr-0.5" />
                      Best Value
                    </Badge>
                  )}
                </div>
                <span className="font-bold text-sm">${option.price_aud} AUD</span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          <Button
            onClick={handleExtend}
            disabled={!selectedMonths || loading}
            className="rounded-full"
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
