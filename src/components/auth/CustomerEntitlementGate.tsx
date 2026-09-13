import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomerEntitlement } from '@/hooks/useCustomerEntitlement';
import { AccountRenewalPackages } from '@/components/Account/AccountRenewalPackages';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/wedding-waitress-full-logo.png';
import styles from './SuspensionNotice.module.css';
import { PromotionActivationNotice } from '@/components/Pricing/PromotionActivationNotice';

/** Enable only with the matching verified backend/API/media enforcement. */
export function CustomerEntitlementGate({userId,enabled=false,children}:React.PropsWithChildren<{userId:string;enabled?:boolean}>){
 const {state,promotion,checking,error,refresh}=useCustomerEntitlement(userId,enabled);
 const queryClient=useQueryClient(),navigate=useNavigate();
 const [exitError,setExitError]=useState('');
 useEffect(()=>{
  if(!enabled||!state||state.status==='active')return;
  void queryClient.cancelQueries();queryClient.clear();
 },[enabled,state?.status,queryClient]);
 const exit=async()=>{
  const {error:failure}=await supabase.auth.signOut();
  if(failure){setExitError('Sign out could not be confirmed. Please try again.');return;}
  navigate('/',{replace:true});
 };
 if(!enabled)return <>{children}</>;
 if(checking)return <main className={styles.surface}><section className={styles.card}><p role="status">Checking your current access…</p></section></main>;
 if(state?.status==='active')return <><PromotionActivationNotice notice={promotion??null} userId={userId}/>{children}</>;
 if(state?.status==='closed')return <Navigate to="/account-recovery" replace/>;
 const trialEnded=state?.status==='trial_expired';
 return <main className={styles.surface} data-entitlement-notice>
  <header><img src={logo} alt="Wedding Waitress"/></header>
  <section className={styles.card}>
   <h1>{error?'Access could not be verified':state?.status==='admin_blocked'||state?.status==='access_unavailable'?'Account access is unavailable':trialEnded?'Your seven-day trial has ended':'Your paid term has ended'}</h1>
   {error?<><p role="alert">No paid or trial access has been granted. Please try again.</p><button onClick={refresh}>Try again</button></>
    :state?.status==='admin_blocked'?<p>Only the Wedding Waitress platform owner may restore this account. Purchasing a package cannot release this restriction.</p>
    :state?.status==='access_unavailable'?<><p>Your entitlement needs review. No expiry or payment requirement has been inferred.</p><button onClick={refresh}>Try again</button></>
    :<AccountRenewalPackages reason={trialEnded?'trial-ended':'paid-expired'}/>}
   <button onClick={()=>void exit()}>Exit / Not Now</button>
   {exitError&&<p role="alert">{exitError}</p>}
  </section>
 </main>;
}
