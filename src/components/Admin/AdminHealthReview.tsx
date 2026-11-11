import React, { useEffect, useMemo, useState } from 'react';
import type { OperationsSnapshot } from './AdminOperationsPages';
import styles from './AdminCentrePages.module.css';

type Check={id:string;label:string;state:string;detail:string;healthy:boolean;version:string};
const storageKey='ww_admin_health_reviews_v1';
const words=(text:string)=>text.replace(/[_-]/g,' ');
export function healthReviewChecks(data:OperationsSnapshot):Check[]{
 const checks:Check[]=[];
 const add=(id:string,label:string,state:string,detail:string,healthy:boolean,version:unknown=[])=>checks.push({id,label,state,detail,healthy,version:JSON.stringify([state,detail,version])});
 for(const [key,value] of Object.entries(data.configuration))add('configuration:'+key,words(key),value?'configured':'missing',value?'Configuration is present; provider availability is checked separately.':'Required configuration is missing.',value);
 const failures=data.queue.failed;
 add('queue:failed','Failed email attempts',failures===null||failures===undefined?'unknown':failures>0?'failed':'clear',failures===null||failures===undefined?'The failed email queue count could not be checked.':`${failures} failed email attempts recorded.`,failures===0,failures);
 if(!data.health)add('health:unavailable','Health checks','unknown','Provider and scheduler results could not be verified.',false);
 else{
  for(const [key,check] of Object.entries(data.health.providers.checks))add('provider:'+key,words(key),check.state,check.detail,check.state==='verified');
  const scheduler=data.health.evidence?.scheduler;
  if(data.health.evidence_state!=='available'||scheduler?.state!=='available')add('scheduler:unavailable','Scheduler evidence','unknown','Scheduler results could not be verified.',false);
  else for(const job of scheduler.jobs)add('scheduler:'+job.name,job.label,job.state,job.schedule?`Schedule: ${job.schedule}. Latest recorded state: ${words(job.state)}.`:'This job is not registered.',job.state==='succeeded',[job.schedule,job.last_started_at,job.last_finished_at]);
 }
 for(const [key,state] of Object.entries(data.availability))if(state!=='available')add('source:'+key,words(key)+' reporting','unknown','This reporting source could not be read.',false);
 return checks;
}
function readReviews():Record<string,string>{
 try{const parsed=JSON.parse(localStorage.getItem(storageKey)||'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};return Object.fromEntries(Object.entries(parsed).filter(([key,value])=>key.length<200&&typeof value==='string'&&value.length<3000).slice(0,100)) as Record<string,string>;}catch{return {};}
}
export function AdminHealthReview({data,children}:{data:OperationsSnapshot;children:React.ReactNode}){
 const checks=useMemo(()=>healthReviewChecks(data),[data]);
 const problems=checks.filter(check=>!check.healthy),healthy=checks.length-problems.length;
 const [reviews,setReviews]=useState(readReviews),[saved,setSaved]=useState(true);
 useEffect(()=>{const current=new Map(problems.map(check=>[check.id,check.version]));setReviews(previous=>{const next=Object.fromEntries(Object.entries(previous).filter(([key,version])=>current.get(key)===version));return JSON.stringify(next)===JSON.stringify(previous)?previous:next;});},[checks]);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(reviews));setSaved(true);}catch{setSaved(false);}},[reviews]);
 return <>
  <section className={styles.section} aria-label="Health issues needing attention">
   <div className={styles.sectionHeader}><div><h2>Needs attention</h2><p>{problems.length} {problems.length===1?'check needs':'checks need'} attention. Acknowledgement records your review; it does not resolve a problem or change its health status.</p></div></div>
   {problems.length===0?<p>No problems were found in the current checks.</p>:<div className={styles.healthIssueList}>{problems.map(check=>{
    const reviewed=reviews[check.id]===check.version;
    return <article className={styles.healthIssue} key={check.id} aria-label={check.label}>
     <div className={styles.healthIssueHeading}><h3>{check.label}</h3><strong className={styles.healthIssueState}>{words(check.state)}</strong></div>
     <p>{check.detail}</p>
     <label className={styles.healthReview}><input type="checkbox" aria-label={'Reviewed: '+check.label} checked={reviewed} onChange={event=>{const checked=event.target.checked;setReviews(previous=>{const next={...previous};if(checked)next[check.id]=check.version;else delete next[check.id];return next;});}}/>{reviewed?'Acknowledged':'Mark as reviewed'}</label>
    </article>;
   })}</div>}
   <p className={styles.healthReviewNote}>{saved?'Review marks are saved on this browser.':'Browser storage is unavailable; review marks last for this visit only.'} A new result or a changed problem clears its acknowledgement. Checks remain visible until resolved.</p>
  </section>
  <details className={styles.healthAllChecks}>
   <summary>All checks · {healthy} healthy · {problems.length} needing attention</summary>
   <div className={styles.healthAllChecksBody}>{children}</div>
  </details>
 </>;
}
