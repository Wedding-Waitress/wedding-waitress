import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { ADDITIONAL_EVENT } from "@/lib/planRegistry";
import { CURRENCIES, formatPrice } from "@/lib/currencyPricing";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  includedEvents: number;
  currentEvents: number;
}

/**
 * Premium "Add another event" modal.
 * Soft cream gradient + brown primary, single CTA.
 */
export const AdditionalEventModal: React.FC<Props> = ({
  isOpen,
  onClose,
  includedEvents,
  currentEvents,
}) => {
  const { toast } = useToast();
  const { currency } = useCurrencyContext();
  const [busy, setBusy] = useState(false);

  const sku = ADDITIONAL_EVENT.prices[currency];
  const priceLabel = formatPrice(currency, sku.price);

  const handleAdd = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          price_id: sku.price_id,
          mode: "payment",
          purchase_type: "additional_event",
          plan_type: "additional_event",
        },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error("Checkout URL missing");
      window.location.href = url;
    } catch (e: unknown) {
      toast({
        title: "Could not start checkout",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div
          className="rounded-2xl border border-[#E8E1D6] shadow-[0_24px_60px_-20px_rgba(150,122,89,0.35)]"
          style={{ background: "linear-gradient(180deg, #FBF7F1 0%, #F4ECE0 100%)" }}
        >
          <div className="flex items-center justify-between px-6 pt-6">
            <div className="flex items-center gap-2 text-[#967A59]">
              <Calendar className="w-5 h-5" />
              <span className="text-xs font-semibold tracking-wide uppercase">Plan capacity</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-[#6E6E73] hover:bg-white/60 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 pt-3 pb-6">
            <h2 className="text-[22px] font-semibold text-[#1D1D1F] tracking-tight">
              You've reached your event limit
            </h2>
            <p className="mt-1.5 text-sm text-[#6E6E73] leading-relaxed">
              Your plan includes <span className="font-medium text-[#1D1D1F]">{includedEvents}</span> event{includedEvents === 1 ? "" : "s"}.
              You currently have <span className="font-medium text-[#1D1D1F]">{currentEvents}</span>.
              Add another event slot to continue planning.
            </p>

            <div className="mt-5 rounded-xl bg-white/70 border border-[#E8E1D6] px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-[#1D1D1F]">Additional Event</p>
                <p className="text-[11.5px] text-[#6E6E73]">One-time, applied to your account</p>
              </div>
              <div className="text-right">
                <p className="text-[20px] font-semibold text-[#1D1D1F] leading-none">{priceLabel}</p>
                <p className="text-[10.5px] text-[#6E6E73] mt-1">{CURRENCIES[currency].label}</p>
              </div>
            </div>

            <Button
              onClick={handleAdd}
              disabled={busy}
              className="lv-premium-shade w-full mt-5 h-11 rounded-xl bg-[#967A59] hover:bg-[#856B4D] text-white font-medium gap-2"
            >
              <Plus className="w-4 h-4" />
              {busy ? "Opening checkout…" : `Add 1 event for ${priceLabel}`}
            </Button>

            <p className="text-[11px] text-[#6E6E73] text-center mt-3">
              Secure checkout · One-time payment · No subscription change
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
