import React,{useEffect,useState} from 'react';
import {useGuestExperienceClient,useGuestExperiencePreview} from '@/contexts/GuestExperiencePreviewContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
export function GuestVerificationGate({eventId,guestId,fullName,copy,onVerified}:{eventId:string;guestId:string;fullName:string;copy:string[];onVerified:(data:any)=>Promise<boolean>}){
 const preview=useGuestExperiencePreview();const supabase=useGuestExperienceClient();
 const [challenge,setChallenge]=useState<string|null>(null),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[resendAt,setResendAt]=useState(0),[now,setNow]=useState(Date.now());
 useEffect(()=>{setChallenge(null);setCode('');setMessage('');setResendAt(0);},[eventId,guestId]);
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
 const request=async()=>{
  if(preview){setChallenge('simulation');setMessage('Simulation only. Enter 000000. No SMS has been sent.');return;}
  if(busy||Date.now()<resendAt)return;setBusy(true);setMessage('');
  try{
   const {data,error}=await supabase.functions.invoke('guest-verification',{body:{action:'request',event_id:eventId,guest_id:guestId,full_name:fullName,request_id:crypto.randomUUID()}});
   setResendAt(Date.now()+60000);
   if(error||data?.status!=='sent'){setMessage(copy[7]);return;}
   setChallenge(data.challenge_id);setCode('');setMessage(copy[12]);
  }catch{setMessage(copy[7]);}finally{setBusy(false);}
 };
 const verify=async(e:React.FormEvent)=>{
  e.preventDefault();if(preview){if(code==='000000')await onVerified({previewGuestId:guestId});else setMessage('For this private simulation enter 000000.');return;}if(busy||!challenge||!/^\d{6}$/.test(code))return;setBusy(true);setMessage('');
  try{
   const {data,error}=await supabase.functions.invoke('guest-verification',{body:{action:'check',challenge_id:challenge,code}});
   if(error||data?.status!=='verified'||!await onVerified(data))setMessage(copy[8]);
  }catch{setMessage(copy[8]);}finally{setBusy(false);setCode('');}
 };
 return <section data-qr-verification-gate className="space-y-4 rounded-xl border p-4 text-center" aria-label={copy[2]}>
  <p data-qr-verification-explanation>{copy[1].split('\n').map((line,index)=><span key={index}>{line}</span>)}</p>
  {!challenge?<Button data-qr-verification-send type="button" onClick={request} disabled={busy||now<resendAt}>{busy?copy[10]:copy[2]}</Button>:<form onSubmit={verify} className="space-y-3">
   <Label htmlFor={'guest-code-'+guestId}>{copy[3]}</Label>
   <Input data-qr-verification-code id={'guest-code-'+guestId} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} disabled={busy} className="text-center" />
   <div className="flex flex-wrap justify-center gap-3"><Button data-qr-verification-confirm type="submit" disabled={busy||!/^\d{6}$/.test(code)}>{busy?copy[11]:copy[4]}</Button><Button type="button" variant="outline" onClick={request} disabled={busy||now<resendAt}>{copy[5]}</Button></div>
  </form>}
  {now<resendAt&&<p className="text-sm">{copy[6]}</p>}
  <p role="status" className="text-sm">{message}</p>
 </section>;
}
