import {customerCountdownProgress} from '@/lib/customerEventCountdown';
import styles from './MyEventsPage.module.css';
export function CustomerCountdownCircle({value,label,type,now}:{value:number|string;label:string;type:string;now?:Date}){
 const progress=value==='--'?0:customerCountdownProgress(type,now),circumference=2*Math.PI*45,strokeDashoffset=circumference-progress/100*circumference;
 return <div className={styles.countdownCircleSlot}><div className={`relative rounded-full lv-premium-shade ${styles.countdownCircle}`}>
  <svg className={`w-full h-full transform -rotate-90 ${styles.countdownRing}`} viewBox="0 0 100 100">
   <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="6"/>
   <circle cx="50" cy="50" r="45" fill="none" stroke="#472c1d" strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-300 ease-out" strokeLinecap="round"/>
  </svg><div className="absolute inset-0 flex flex-col items-center justify-center">
   <span className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground animate-fade-in ${styles.countdownNumber}`}>{value}</span>
   <span className={`text-xs uppercase tracking-wide text-muted-foreground font-medium ${styles.countdownLabel}`}>{label}</span>
  </div></div></div>;
}
