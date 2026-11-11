import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { AccountInfoCard } from './AccountInfoCard';
import { SecurityCard } from './SecurityCard';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const panels = [
  { id: 'personal', title: 'Your personal details', description: 'Profile image, contact details and email preferences' },
  { id: 'security', title: 'Security & Password', description: 'Password and email verification' },
  { id: 'close', title: 'Close Account', description: 'Account deactivation and reopening controls' },
] as const;
export const AccountInfoPanels = ({ loginEmail }: { loginEmail: string }) => {
  const [selected, setSelected] = useState<typeof panels[number] | null>(null);
  return <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Account information options">
      {panels.map(panel => <button key={panel.id} type="button" onClick={() => setSelected(panel)} aria-haspopup="dialog" className="min-w-0 rounded-xl border border-[#CDB99E] bg-[#FBF8F2] p-6 text-left text-[#2b1711] shadow-sm hover:bg-[#F5EBDD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806344]">
        <span className="block text-[17px] font-bold">{panel.title}</span>
        <span className="mt-2 block text-sm text-[#684b40]">{panel.description}</span>
      </button>)}
    </div>
    <Sheet open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
      <SheetContent side="right" className="w-full sm:max-w-[760px] overflow-y-auto bg-[#FBF8F2] text-[#2b1711] p-4 sm:p-6">
        <SheetHeader className="mb-6 pr-8 text-left">
          <SheetTitle>{selected?.title}</SheetTitle>
          <SheetDescription>{selected?.description}</SheetDescription>
        </SheetHeader>
        {selected?.id === 'personal' && <AccountInfoCard icon={User} loginEmail={loginEmail} />}
        {selected?.id === 'security' && <SecurityCard icon={Lock} section="security" />}
        {selected?.id === 'close' && <SecurityCard icon={Lock} section="close" />}
      </SheetContent>
    </Sheet>
  </>;
};
