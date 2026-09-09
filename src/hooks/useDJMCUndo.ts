import {useEffect,useRef,useState} from 'react';
import {DJMCSection} from '@/types/djMCQuestionnaire';
import {saveDJMCSnapshot,readDJMCSnapshot,restoreDJMCSongRequests} from '@/lib/djmcUndo';
import {createDJMCPronunciationSignedUrl,deleteDJMCPronunciation,uploadDJMCPronunciation} from '@/lib/djmcPronunciationStorage';
import {useToast} from '@/hooks/use-toast';

type Snapshot = {sections:DJMCSection[];requests?:import('@/hooks/useGuestSongRequests').GuestSongRequestRow[]};
export function useDJMCUndo({questionnaireId,eventId,sections,shareToken,canEdit=true,beforeRestore,refresh}: {
 questionnaireId?:string;eventId?:string;sections:DJMCSection[];shareToken?:string;canEdit?:boolean;
 beforeRestore:()=>Promise<void>;refresh:()=>Promise<unknown>;
}) {
 const [history,setHistory]=useState<Snapshot[]>([]);
 const [busy,setBusy]=useState<false | "saving" | "restoring">(false);
 const [revision,setRevision]=useState(0);
 const recordings=useRef(new Map<string,Blob>());
 const restoredPaths=useRef(new Map<string,string>());
 const latest=useRef(sections);latest.current=sections;
 const scope=`${questionnaireId}:${shareToken||''}`;
 const active=useRef(scope);active.current=scope;
 const working=useRef(false);
 const nested=useRef(false);
 const {toast}=useToast();
 useEffect(()=>{setHistory([]);recordings.current.clear();restoredPaths.current.clear();},[scope]);
 const backup = async (snapshot:DJMCSection[]) => {
  for(const item of snapshot.flatMap(s=>s.items)) {
   const path=item.pronunciation_audio_path||item.pronunciation_audio_url;
   if(!path||recordings.current.has(path))continue;
   const access={eventId:eventId!,itemId:item.id,shareToken};
   const url=item.pronunciation_audio_path?await createDJMCPronunciationSignedUrl(path,access):path;
   const response=await fetch(url);if(!response.ok)throw new Error('Recording backup failed');
   const originalBlob=await response.blob();
   const type=originalBlob.type.startsWith('audio/')?originalBlob.type:path.endsWith('.ogg')?'audio/ogg':path.endsWith('.mp4')||path.endsWith('.m4a')?'audio/mp4':'audio/webm';
   const blob=new Blob([originalBlob],{type});
   if([...recordings.current.values()].reduce((sum,b)=>sum+b.size,0)+blob.size>64*1024*1024)throw new Error('Recording backup exceeds available Undo memory');
   recordings.current.set(path,blob);
  }
 };
 const run = async (action:()=>unknown|Promise<unknown>, includeRecordings=false,requests?:Snapshot['requests']) => {
  if(!canEdit || !questionnaireId)return;
  if(nested.current)return action();
  if(working.current)return;
  const snapshot={sections:structuredClone(latest.current),requests:requests?structuredClone(requests):undefined};
  working.current=true;setBusy("saving");
  try {
   if(includeRecordings)await backup(snapshot.sections);
   if(active.current!==scope)return;
   setHistory(prev=>[...prev.slice(-19),snapshot]);
   nested.current=true;
   await action();
  }catch(error){toast({title:'Change could not be completed',description:'Your recovery copy could not be prepared or saved. Please try again.',variant:'destructive'});}
  finally{nested.current=false;working.current=false;setBusy(false);}
 };
 const record = (action:()=>unknown) => {
  if(!canEdit||!questionnaireId)return;
  if(nested.current)return action();
  if(working.current)return;
  setHistory(prev=>[...prev.slice(-19),{sections:structuredClone(latest.current)}]);
  return action();
 };
 const undo = async () => {
  if(!canEdit||!questionnaireId||!eventId||working.current||!history.length)return;
  const entry=history[history.length-1];
  working.current=true;setBusy("restoring");
  try {
   await beforeRestore();
   if(active.current!==scope)return;
   const desired=entry.sections.flatMap(s=>s.items);
   // Back up current recordings as well before removing files introduced by the reverted change.
   const currentSections=await readDJMCSnapshot(questionnaireId,shareToken);
   await backup(currentSections);
   for(const item of currentSections.flatMap(s=>s.items)) {
    const path=item.pronunciation_audio_path||item.pronunciation_audio_url;
    const target=desired.find(i=>i.id===item.id);
    const original=target?.pronunciation_audio_path||target?.pronunciation_audio_url;
    const wanted=original&&(restoredPaths.current.get(original)||original);
    if(path&&path!==wanted)await deleteDJMCPronunciation(path,{eventId,itemId:item.id,shareToken});
   }
   await saveDJMCSnapshot(questionnaireId,entry.sections,shareToken);
   const savedSections=await readDJMCSnapshot(questionnaireId,shareToken);
   for(const item of desired) {
    if(active.current!==scope)return;
    const original=item.pronunciation_audio_path||item.pronunciation_audio_url;
    if(!original)continue;
    const wanted=restoredPaths.current.get(original)||original;
    const current=savedSections.flatMap(s=>s.items).find(i=>i.id===item.id);
    if(current&&(current.pronunciation_audio_path||current.pronunciation_audio_url)===wanted)continue;
    // A successful upload is retained across retry if a later recording fails.
    if(restoredPaths.current.has(original))continue;
    const blob=recordings.current.get(original);
    if(!blob)throw new Error('Recording recovery copy is unavailable');
    const path=await uploadDJMCPronunciation(blob,{eventId,itemId:item.id,shareToken});
    restoredPaths.current.set(original,path);
   }
   if(active.current!==scope)return;
   if(entry.requests){if(shareToken)throw new Error('Owner access required');await restoreDJMCSongRequests(eventId,entry.requests);}
   await refresh();
   setRevision(value=>value+1);
   const remapped=new Map(restoredPaths.current);
   for(const [oldPath,newPath] of remapped){const blob=recordings.current.get(oldPath);if(blob)recordings.current.set(newPath,blob);}
   setHistory(prev=>prev.slice(0,-1).map(snapshot=>({...snapshot,sections:snapshot.sections.map(section=>({...section,items:section.items.map(item=>{
    const path=item.pronunciation_audio_path||item.pronunciation_audio_url;
    return path&&remapped.has(path)?{...item,pronunciation_audio_path:remapped.get(path)!,pronunciation_audio_url:null}:item;
   })}))})));
   restoredPaths.current.clear();
  }catch(error){toast({title:'Undo not complete',description:'The recovery copy is still available. Please try Undo again to finish restoring all text and recordings.',variant:'destructive'});}
  finally{working.current=false;setBusy(false);}
 };
 return {run,record,undo,busy:!!busy,operation:busy,revision,canUndo:canEdit&&history.length>0};
}
