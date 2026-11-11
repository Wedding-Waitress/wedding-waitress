import React,{useEffect,useState}from'react';
import {useUserPlan}from'@/hooks/useUserPlan';
import {TrialLimitChoice}from'./TrialLimitChoice';
import {isActiveFreeTrial} from '@/lib/activeTrial';
import {TRIAL_LIMIT_EVENT}from'@/lib/trialUpgrade';

export function withTrialUpgradeChoice(Component:React.ComponentType,PackageChooser:React.ComponentType<{open:boolean;onOpenChange:(open:boolean)=>void}>){
 function Controller(){
  const {plan,hasPlatformOwnerAccess}=useUserPlan();
  const [open,setOpen]=useState(false),[packages,setPackages]=useState(false);
  useEffect(()=>{const show=()=>{if(isActiveFreeTrial(plan,hasPlatformOwnerAccess))setOpen(true);};window.addEventListener(TRIAL_LIMIT_EVENT,show);return()=>window.removeEventListener(TRIAL_LIMIT_EVENT,show);},[plan,hasPlatformOwnerAccess]);
  return <><TrialLimitChoice trialStartedAt={plan?.trial_started_at} trialEndsAt={plan?.expires_at} open={open} onContinue={()=>setOpen(false)} onChoosePackage={()=>{setOpen(false);setPackages(true);}}/>{packages&&<React.Suspense fallback={null}><PackageChooser open onOpenChange={setPackages}/></React.Suspense>}</>;
 }
 return function TrialAwareDashboard(){return <><Component/><Controller/></>;};
}
