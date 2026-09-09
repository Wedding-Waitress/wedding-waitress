import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { guestDietaryOptions } from './guestDietaryOptions';
import styles from './GuestAdditionalFields.module.css';
export interface AdditionalGuestDraft { first_name:string; last_name:string; email:string; mobile:string; dietary:string; notes:string; group_choice:''|'separate'|'group' }
export const emptyAdditionalGuest=():AdditionalGuestDraft=>({first_name:'',last_name:'',email:'',mobile:'',dietary:'NA',notes:'',group_choice:''});
export function GuestAdditionalFields({members, drafts, onChange, canAdd, category, className, headingClassName, categorySelector}:{members:any[];drafts:AdditionalGuestDraft[];onChange:(v:AdditionalGuestDraft[])=>void;canAdd:boolean;category:'individual'|'couple'|'family';className?:string;headingClassName?:string;categorySelector?:React.ReactNode}) {
 const patch=(i:number,key:keyof AdditionalGuestDraft,value:string)=>onChange(drafts.map((d,j)=>i===j?{...d,[key]:value}:d));
 return <section data-category={category} className={`space-y-3 rounded-xl border border-primary p-3 ${className||''}`}>
  <h3 className={`font-semibold ${headingClassName||''}`}>Couple / Family & Additional Guests</h3>
  {categorySelector}
  <p>{members.length+drafts.filter(d=>d.group_choice==='group').length>2?'Family':members.length+drafts.filter(d=>d.group_choice==='group').length===2?'Couple':'Individual'}</p>
  <ul>{members.map(m=><li key={m.id}>{m.first_name} {m.last_name}</li>)}</ul>
  {drafts.map((d,i)=><fieldset key={i} className="space-y-3 border border-primary/40 rounded-xl p-3"><legend>Additional Guest {i+1}</legend>
   <div className="space-y-2"><Label>Is this person part of your group?</Label><div className="flex flex-wrap gap-2">{(['separate','group'] as const).map(choice=><Button key={choice} type="button" className="lv-premium-btn whitespace-normal h-auto min-h-10" aria-pressed={d.group_choice===choice} onClick={()=>patch(i,'group_choice',choice)}>{d.group_choice===choice?'✓ ':''}{choice==='separate'?'Separate Guest':'Part of Our Group'}</Button>)}</div></div>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(['first_name','last_name','mobile','email'] as const).map(key=><div key={key}><Label htmlFor={'extra-'+i+'-'+key}>{({first_name:'First Name *',last_name:'Last Name *',mobile:'Mobile',email:'Email'})[key]}</Label><Input id={'extra-'+i+'-'+key} maxLength={key.includes('name')?100:150} type={key==='email'?'email':key==='mobile'?'tel':'text'} value={d[key]} onChange={e=>patch(i,key,e.target.value)}/></div>)}</div>
   <Label htmlFor={'extra-dietary-'+i}>Dietary Requirements</Label>
   <Select value={d.dietary||'NA'} onValueChange={value=>patch(i,'dietary',value)}>
    <SelectTrigger id={'extra-dietary-'+i} className="border-primary w-full"><SelectValue /></SelectTrigger>
    <SelectContent className="ww-public-live-menu">
     {guestDietaryOptions.map(option=><SelectItem key={option} value={option}>{option}</SelectItem>)}
    </SelectContent>
   </Select>
   <Label htmlFor={'extra-notes-'+i}>Notes</Label><Textarea id={'extra-notes-'+i} value={d.notes} onChange={e=>patch(i,'notes',e.target.value)}/>
   <p className="text-sm">The organiser will assign their table and seat.</p>
   <div className={styles.entryActions}>
    {i===drafts.length-1&&<p className={styles.saveReminder}>Please, save at bottom</p>}
    <div className={styles.buttonPair}>
     <Button type="button" className={`lv-premium-btn ${styles.entryActionButton}`} onClick={()=>onChange(drafts.filter((_,j)=>i!==j))}>Remove Guest</Button>
     {i===drafts.length-1&&canAdd&&<Button type="button" className={`lv-premium-btn ${styles.entryActionButton}`} disabled={drafts.length>=20} onClick={()=>onChange([...drafts,emptyAdditionalGuest()])}>Add Additional Guest</Button>}
    </div>
   </div>
  </fieldset>)}
  {canAdd&&drafts.length===0&&<Button type="button" className={`lv-premium-btn ${styles.initialAddButton}`} onClick={()=>onChange([...drafts,emptyAdditionalGuest()])}>Add Additional Guest</Button>}
 </section>;
}
