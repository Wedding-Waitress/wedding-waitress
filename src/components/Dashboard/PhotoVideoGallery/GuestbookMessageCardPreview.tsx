import React,{useEffect,useState} from 'react';
import {renderGuestbookMessageCards} from '@/lib/guestbookMessageCard';
import type {GuestbookPdfMessage,GuestbookPdfEvent} from '@/lib/guestbookMessagePdf';
export function GuestbookMessageCardPreview({message,event,className="",imageClassName="block w-full h-auto",firstPageOnly=false}:{message:GuestbookPdfMessage;event:GuestbookPdfEvent;className?:string;imageClassName?:string;firstPageOnly?:boolean}){
  const [state,setState]=useState<{key:string;images:string[];error:string}>({key:'',images:[],error:''});
  const key=JSON.stringify([message,event]);
  useEffect(()=>{let current=true;renderGuestbookMessageCards(message,event).then(cards=>{if(current)setState({key,images:cards.map(card=>card.toDataURL('image/png')),error:''})}).catch(reason=>{if(current)setState({key,images:[],error:reason instanceof Error?reason.message:'The card could not be displayed.'})});return()=>{current=false}},[key]);
  return <div className={"flex flex-col gap-3 "+className}>
    <div className="sr-only"><p>{event.name}</p><p>{message.name}</p><p>{message.message}</p></div>
    {state.key!==key ? <p role="status">Preparing your message card…</p> : state.error ?
      <div role="alert"><p>{state.error}</p><p>{message.message}</p></div> :
      (firstPageOnly?state.images.slice(0,1):state.images).map((src,index)=><img key={index} src={src} alt="" className={imageClassName} width={1200} height={1800}/>)}
  </div>;
}
