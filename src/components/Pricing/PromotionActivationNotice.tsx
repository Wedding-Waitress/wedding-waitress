import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PromotionNotice } from '@/lib/promotionNotice';
export function PromotionActivationNotice({notice,userId}:{notice:PromotionNotice|null;userId:string}){
 const [acknowledged,setAcknowledged]=useState('');
 const key=notice?`ww:promotion-notice:${userId}:${notice.reservationId}:${notice.state}`:'';
 let stored=false;try{stored=!!key&&sessionStorage.getItem(key)==='acknowledged';}catch{/* storage optional */}
 const close=()=>{setAcknowledged(key);try{sessionStorage.setItem(key,'acknowledged');}catch{/* storage optional */}};
 if(!notice)return null;
 const date=(value:string)=>new Date(value).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
 return <Dialog open={acknowledged!==key&&!stored} onOpenChange={open=>{if(!open)close();}}><DialogContent>
  <DialogTitle>{notice.state==='scheduled'?'Your trial stays free':'Your promotional package is active'}</DialogTitle>
  <DialogDescription>{notice.state==='scheduled'?`Your seven-day trial remains unchanged. Your confirmed ${notice.percent}% offer starts twelve months of package access on ${date(notice.startsAt)}.`:`Your confirmed ${notice.percent}% offer provides package access until ${date(notice.expiresAt)}.`}</DialogDescription>
  <p className="text-sm">{notice.credits===0?'Zero new included Email & SMS credits. Purchased credits stay intact; you can buy top-ups.':`${notice.credits} shared Email & SMS credits included.`} All other package limits remain unchanged.</p>
  <Button onClick={close}>Continue planning</Button>
 </DialogContent></Dialog>;
}
