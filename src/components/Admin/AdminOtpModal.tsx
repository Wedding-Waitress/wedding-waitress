import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoImage from '@/assets/wedding-waitress-full-logo.png';
import styles from './AdminOtpModal.module.css';

interface Props { open:boolean; onOpenChange:(open:boolean)=>void }
export const AdminOtpModal:React.FC<Props>=({open,onOpenChange})=>{
  const [sending,setSending]=useState(false);const [verifying,setVerifying]=useState(false);const [code,setCode]=useState('');const [phone,setPhone]=useState('');const [sent,setSent]=useState(false);const [remaining,setRemaining]=useState(0);const [error,setError]=useState('');const navigate=useNavigate();
  // Synchronous locks protect the requests before React can render disabled buttons.
  const codeInputRef=useRef<HTMLInputElement>(null);
  const sendingRef=useRef(false);
  const verifyingRef=useRef(false);
  const attemptedCodes=useRef(new Set<string>());
  const currentOpen=useRef(open);currentOpen.current=open;
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const sendCode=async()=>{
    if(sendingRef.current||verifyingRef.current)return;
    sendingRef.current=true;setSending(true);setError('');
    try{
      const {data,error:invokeError}=await supabase.functions.invoke('admin-send-otp');
      if(!mounted.current||!currentOpen.current)return;
      const message=(data as {error?:string}|null)?.error||invokeError?.message;
      if(message){setError(message);return;}
      attemptedCodes.current.clear();setCode('');
      setPhone((data as {masked_phone?:string}|null)?.masked_phone||'your verified phone');setSent(true);setRemaining(60);
    }catch{if(mounted.current&&currentOpen.current)setError('A verification code could not be sent. Please try again.');}
    finally{sendingRef.current=false;if(mounted.current)setSending(false);}
  };
  useEffect(()=>{if(open&&!sent&&!sending)void sendCode();if(!open){setCode('');setSent(false);setPhone('');setRemaining(0);setError('');attemptedCodes.current.clear();}},[open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(remaining<=0)return;const timer=window.setInterval(()=>setRemaining(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer);},[remaining]);
  // Focus only when entry becomes available, never on keystrokes or countdown ticks.
  useEffect(()=>{if(open&&sent&&!sending&&!verifying)codeInputRef.current?.focus();},[open,sent,sending,verifying]);
  const verify=async(candidate=code,automatic=false)=>{
    if(!open||!sent||sendingRef.current||verifyingRef.current)return;
    if(!/^\d{6}$/.test(candidate)){setError('Enter the complete six-digit verification code.');return;}
    // A failed unchanged value is never retried automatically; Verify remains an explicit retry.
    if(automatic&&attemptedCodes.current.has(candidate))return;
    verifyingRef.current=true;attemptedCodes.current.add(candidate);setVerifying(true);setError('');
    try{
      const {data,error:invokeError}=await supabase.functions.invoke('admin-verify-otp',{body:{code:candidate}});
      if(!mounted.current||!currentOpen.current)return;
      const message=(data as {error?:string}|null)?.error||invokeError?.message;
      if(message){setError(/expired/i.test(message)?'That code has expired. Request a new code and try again.':/invalid/i.test(message)?'That code is incorrect. Check the code and try again.':message);return;}
      const grant=(data as {grant?:string}|null)?.grant;const signature=(data as {signature?:string}|null)?.signature;
      if(!grant||!signature){setError('Verification could not be confirmed. Please try again.');return;}
      sessionStorage.setItem('ww_admin_grant',grant);sessionStorage.setItem('ww_admin_grant_sig',signature);
      onOpenChange(false);navigate('/admin/overview');
    }catch{if(mounted.current&&currentOpen.current)setError('Verification could not be confirmed. Please try again.');}
    finally{verifyingRef.current=false;if(mounted.current)setVerifying(false);}
  };
  // Typing, paste and native one-time-code autofill all enter through this path.
  // Event-driven submission avoids retries caused by effects, renders or Strict Mode.
  const change=(value:string)=>{const next=value.replace(/\D/g,'').slice(0,6);setCode(next);if(next.length===6)void verify(next,true);};
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={styles.dialog}><DialogHeader className={styles.header}><img src={logoImage} alt="Wedding Waitress" className={styles.logo}/><div className={styles.eyebrow}><ShieldCheck/>Secure administrator access</div><DialogTitle className={styles.title}>Admin Verification</DialogTitle><DialogDescription className={styles.description}>{sending&&!sent?'Sending a verification code…':sent?`Enter the six-digit code sent to ${phone}.`:'Verify your identity to continue.'}</DialogDescription></DialogHeader><div className={styles.body}><input ref={codeInputRef} aria-label="Six-digit verification code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>change(e.target.value)} onPaste={e=>{e.preventDefault();change(e.clipboardData.getData('text'));}} disabled={!sent||verifying} className={styles.code} placeholder="000000"/><p className={styles.expiry}>Codes expire after 10 minutes. Five incorrect attempts invalidate the code.</p>{error&&<p className={styles.error} role="alert">{error}</p>}<button type="button" className={styles.verify} onClick={()=>void verify()} disabled={!sent||code.length!==6||verifying}>{verifying?<><Loader2 className={styles.spinner}/>Verifying…</>:'Verify'}</button><button type="button" className={styles.resend} onClick={()=>void sendCode()} disabled={sending||verifying||remaining>0}>{sending?'Sending…':remaining>0?`Resend Code in ${remaining}s`:'Resend Code'}</button><button type="button" className={styles.return} onClick={()=>onOpenChange(false)}>Close and return to Wedding Waitress</button></div></DialogContent></Dialog>;
};

