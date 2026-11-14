import React from 'react';
import {HeartHandshake,PartyPopper,UserRound,CalendarDays,MapPin,Clock3,Users} from 'lucide-react';
import styles from './MyEventsPage.module.css';

const fields = [
  {key:'name',label:'Name',Icon:UserRound},
  {key:'date',label:'Date',Icon:CalendarDays},
  {key:'location',label:'Location',Icon:MapPin},
  {key:'time',label:'Time',Icon:Clock3},
  {key:'guests',label:'Guests',Icon:Users},
] as const;
type FieldKey = typeof fields[number]['key'];
interface Props {kind:'ceremony'|'reception';values:Record<FieldKey,React.ReactNode>}

/** Both event cards share the same typography, icon boxes and detail rows. */
export function MyEventsSummaryCard({kind,values}:Props){
 const title=kind==='ceremony'?'Ceremony':'Reception';
 const HeadingIcon=kind==='ceremony'?HeartHandshake:PartyPopper;
 return <section data-event-summary-card={kind} aria-label={title+' details'} className={
   'min-w-0 bg-muted/30 rounded-xl p-3 sm:p-4 border border-border text-left shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] '+styles.detailCard+' '+styles.summaryCard}>
  <h4 data-summary-heading className={styles.detailHeading+' '+styles.summaryHeading}><HeadingIcon size={20} strokeWidth={1.8} aria-hidden="true"/><span>{title}</span></h4>
  <dl className={styles.detailText+' '+styles.summaryRows}>
   {fields.map(({key,label,Icon})=><div key={key} data-summary-row={key} className={styles.summaryRow}>
    <dt className={styles.summaryLabel}><Icon size={16} strokeWidth={1.8} aria-hidden="true"/><span>{label}:</span></dt>{' '}
    <dd className={styles.summaryValue}>{values[key]}</dd>
   </div>)}
  </dl>
 </section>;
}
