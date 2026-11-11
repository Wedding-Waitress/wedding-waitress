import React from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import './TrialUpgradeButton.css';

export interface TrialLimitChoiceProps {
 open:boolean;onContinue:()=>void;onChoosePackage:()=>void;
 trialStartedAt?:string|null;trialEndsAt?:string|null;
}
export function formatTrialDate(iso?:string|null) {
 const date=iso ? new Date(iso) : null;
 return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}) : 'Unavailable';
}
/** An upgrade choice never changes entitlement or discards planning answers. */
export function TrialLimitChoice({open,onContinue,onChoosePackage,trialStartedAt,trialEndsAt}:TrialLimitChoiceProps){
 return <Dialog open={open} onOpenChange={value=>{if(!value)onContinue();}}>
  <DialogContent className="ww-table-limit-dialog w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto border-[#dbc6a4] bg-[#FBF9F4] text-[#2f1b14]">
   <DialogHeader><DialogTitle>Your free trial</DialogTitle><DialogDescription>You can keep planning within your trial limits or upgrade now to add more guests.</DialogDescription></DialogHeader>
   <ul className="my-3 list-disc space-y-2 pl-5 text-sm"><li>7-day free trial</li><li>Up to 20 guests</li><li>Maximum 5 tables</li></ul>
   <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
    <dt>Trial start date</dt><dd>{formatTrialDate(trialStartedAt)}</dd>
    <dt>Trial end date</dt><dd>{formatTrialDate(trialEndsAt)}</dd>
   </dl>
   <p className="text-sm">Choosing a package gives you its guest allowance, unlimited tables and 12 months of access after checkout is confirmed.</p>
   <div className="mt-4 flex flex-col gap-2">
    <button type="button" onClick={onChoosePackage} className="ww-trial-upgrade-button">Upgrade Now</button>
    <button type="button" onClick={onContinue} className="min-h-10 rounded-full border border-[#967A59] px-4 py-2 font-semibold">Continue my free trial</button>
   </div>
  </DialogContent>
 </Dialog>;
}
