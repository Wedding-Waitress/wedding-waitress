import React, { useState } from 'react';
import { CreditCard, History, Receipt } from 'lucide-react';
import { SubscriptionCard } from './SubscriptionCard';
import { BillingCard } from './BillingCard';
import { HistoryCard } from './HistoryCard';
import { MasterOnly } from '@/components/permissions/MasterOnly';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
const panels = [
  {id:'plan', title:'Current Plan', description:'Plan status, allowances and usage'},
  {id:'billing', title:'Billing Details', description:'Payment method and recent invoice'},
  {id:'history', title:'Invoices & Payment History', description:'Past payments and invoice records'},
] as const;
export const PlanBillingSection: React.FC = () => {
  const [selected, setSelected] = useState<typeof panels[number] | null>(null);
  const tile = (panel: typeof panels[number]) => <button type="button" onClick={()=>setSelected(panel)} aria-haspopup="dialog" className="min-w-0 rounded-xl border border-[#CDB99E] bg-[#FBF8F2] p-6 text-left text-[#2b1711] shadow-sm hover:bg-[#F5EBDD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806344]">
    <span className="block text-[17px] font-bold">{panel.title}</span><span className="mt-2 block text-sm text-[#684b40]">{panel.description}</span>
  </button>;
  return <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-plan-billing aria-label="Plan and billing options">
      {tile(panels[0])}
      <MasterOnly fallback="hide">{tile(panels[1])}</MasterOnly>
      <MasterOnly fallback="hide">{tile(panels[2])}</MasterOnly>
    </div>
    <Sheet open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}}>
      <SheetContent side="right" className="w-full sm:max-w-[760px] overflow-y-auto bg-[#FBF8F2] text-[#2b1711] p-4 sm:p-6">
        <SheetHeader className="mb-6 pr-8 text-left"><SheetTitle>{selected?.title}</SheetTitle><SheetDescription>{selected?.description}</SheetDescription></SheetHeader>
        {selected?.id==='plan' && <SubscriptionCard icon={CreditCard}/>}
        {selected?.id==='billing' && <MasterOnly fallback="hide"><BillingCard icon={Receipt}/></MasterOnly>}
        {selected?.id==='history' && <MasterOnly fallback="hide"><HistoryCard icon={History}/></MasterOnly>}
      </SheetContent>
    </Sheet>
  </>;
};
