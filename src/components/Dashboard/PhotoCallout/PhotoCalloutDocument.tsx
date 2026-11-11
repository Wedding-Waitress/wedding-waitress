import React, {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import type {PhotoCard,PhotoEvent} from '@/types/photoCallout';
import {partnerLabel,normalizePhotoCard} from '@/types/photoCallout';
import {paginatePhotoCards,photoCardSpan,photoCardTimingLine} from '@/lib/photoCalloutLayout';
import {photoEventDetails} from '@/lib/photoCalloutEventDetails';
import {PhotoCardNumber,PhotoCardCount,PhotoPartnerBadge,PhotoPriorityLabel} from './PhotoCardLabels';
import s from './PhotoCalloutDocument.module.css';
import {waitForPhotoCardLayout} from '@/lib/photoCalloutReady';
import {PhotoCardTitle} from './PhotoCardTitle';
export function PhotoCalloutDocument({cards:inputCards,event,generatedAt,onSelect,onCheck,selectedId,documentRef}:{cards:PhotoCard[];event:PhotoEvent;generatedAt:Date;onSelect?:(card:PhotoCard)=>void;onCheck?:(card:PhotoCard)=>void;selectedId?:string;documentRef?:React.RefObject<HTMLDivElement>}) {
 const cards=inputCards.map(normalizePhotoCard);
 const viewport=useRef<HTMLDivElement>(null);const [scale,setScale]=useState(1);
 useEffect(()=>{const node=viewport.current;if(!node)return;const observer=new ResizeObserver(()=>setScale(Math.min(1,node.clientWidth/794)));observer.observe(node);return()=>observer.disconnect();},[]);
 const details=photoEventDetails(event);const ownRoot=useRef<HTMLDivElement>(null);const root=documentRef||ownRoot;
 const layoutKey=JSON.stringify([cards,details.length]);const [fit,setFit]=useState<{key:string;spans:Record<string,1|2>}|null>(null);const [pageIndex,setPageIndex]=useState(0);const [allPages,setAllPages]=useState(false);
 const sizing=fit?.key!==layoutKey;const spans=sizing?{}:fit.spans;const pages=paginatePhotoCards(cards,spans);const currentPage=Math.min(pageIndex,Math.max(0,pages.length-1));const factor=scale;
 useEffect(()=>{setPageIndex(0);},[event.id]);
 useEffect(()=>{let active=true;async function measure(){const node=root.current;if(!node||!active)return;await waitForPhotoCardLayout(node);if(!active)return;const next:Record<string,1|2>={};node.querySelectorAll<HTMLElement>('[data-photo-card]').forEach(card=>{if(card.scrollHeight>card.clientHeight+2)next[card.dataset.photoCard!]=2;});setFit({key:layoutKey,spans:next});}void measure();return()=>{active=false;};},[layoutKey,root]);
 useEffect(()=>{const node=root.current;if(!node)return;const expand=()=>flushSync(()=>setAllPages(true));const restore=()=>flushSync(()=>setAllPages(false));node.addEventListener('photo-export-start',expand);node.addEventListener('photo-export-end',restore);window.addEventListener('beforeprint',expand);window.addEventListener('afterprint',restore);return()=>{node.removeEventListener('photo-export-start',expand);node.removeEventListener('photo-export-end',restore);window.removeEventListener('beforeprint',expand);window.removeEventListener('afterprint',restore);};},[root]);
 const pager=(position:string)=><nav className={s.pager} aria-label={position+' photo card pages'}><button type="button" disabled={currentPage===0||sizing||allPages} onClick={()=>setPageIndex(currentPage-1)}><ChevronLeft size={16}/>Previous</button><span aria-live="polite">Page {currentPage+1} of {pages.length}</span><button type="button" disabled={currentPage>=pages.length-1||sizing||allPages} onClick={()=>setPageIndex(currentPage+1)}>Next<ChevronRight size={16}/></button></nav>;
 const timestamp=generatedAt.toLocaleString('en-AU',{timeZone:event.event_timezone||'Australia/Sydney',day:'2-digit',month:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'});
 return <>{pages.length>0&&pager('Top')}<div ref={viewport} className={s.viewport}><div ref={root} data-photo-document data-photo-layout-ready={!sizing}>
 {pages.map((page,index)=>(allPages||sizing||index===currentPage)?<div key={index} className={`${s.scaleShell} ${(allPages||sizing)&&index?s.pageGap:''}`}  style={{width:794*factor,height:1123*factor}} data-print-mirror-presentation="true"><div className={s.scale} style={{transform:`scale(${factor})`}} data-photo-scale>
  <section className={s.sheet} style={{'--photo-heading-height':details.length>1?'30mm':'25mm'} as React.CSSProperties} data-photo-sheet data-print-mirror-document="photo-callout-cards"><header className={s.heading} style={{height:'var(--photo-heading-height)'}}><h2>{event.name}</h2><h3>Photo Call Out Cards = {cards.length} Groups</h3>{details.map(line=><p key={line}>{line}</p>)}</header>
  <div className={s.grid}>{page.map(card=><article key={card.id} className={`${s.card} ${selectedId===card.id?s.selected:''}`} data-wide={(spans[card.id]??photoCardSpan(card))===2} data-category={card.category} data-everyone={!!card.everyone} data-priority={card.mustHave} data-photo-card={card.id} onClick={()=>onSelect?.(card)} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onSelect?.(card);}}} tabIndex={onSelect?0:undefined} role={onSelect?'button':undefined} aria-label={onSelect?`Edit photo ${cards.indexOf(card)+1}: ${card.title}`:undefined}>
   <div className={s.meta}><PhotoCardNumber number={cards.indexOf(card)+1}/><PhotoCardCount number={cards.indexOf(card)+1} total={cards.length}/><div className={s.badge}><PhotoPartnerBadge label={partnerLabel(card,event)}/></div><button type="button" className={s.tick} role="checkbox" aria-checked={card.completed} aria-label={`Photo ${cards.indexOf(card)+1} completed`} disabled={!onCheck} onClick={e=>{e.stopPropagation();onCheck?.(card);}} /></div>
   <PhotoCardTitle title={card.title}/><p className={s.timing} data-photo-timing>{photoCardTimingLine(card)}</p>{card.everyone?<p className={s.names}>All guests</p>:<div className={`${s.names} ${s.guestGrid}`} role="list" aria-label="Guests in this photo">{card.people.length?card.people.map(person=><div key={person.id} role="listitem" className={s.guestName}>{person.name}</div>):<div>Add guest names</div>}</div>}
   <div className={s.details}>{card.notes&&<p>{card.notes}</p>}{card.pronunciation&&<p>Pronunciation: {card.pronunciation}</p>}</div>{card.mustHave&&<div className={s.priority}><PhotoPriorityLabel/></div>}
  </article>)}</div>
  <footer className={s.footer}><span>Page {index+1} of {pages.length}</span><img src="/wedding-waitress-logo-dark-brown.png" alt="Wedding Waitress"/><span>Generated: {timestamp}</span></footer></section>
 </div></div>:null)}
 </div></div>{pages.length>0&&pager('Bottom')}</>;
}
