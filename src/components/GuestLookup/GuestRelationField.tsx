import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X } from 'lucide-react';
import { RELATION_ROLE_OPTIONS } from '@/lib/relationUtils';
import styles from './GuestRelationField.module.css';

const ROLE_ORDER = ['bridal_party', 'father', 'mother', 'brother', 'sister', 'uncle', 'aunty', 'cousin', 'guest', 'vendor'];

export function GuestRelationField({ context, value, onChange }: { context: any; value: { relation_partner: string; relation_role: string; custom_relation: string }; onChange: (value: any) => void }) {
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState(value);
 if (!context || context.relation_mode==='off') return null;
 const roleOrder=new Map(ROLE_ORDER.map((role,index)=>[role,index]));
 const roles=[...RELATION_ROLE_OPTIONS].sort((a,b)=>(roleOrder.get(a.value)??ROLE_ORDER.length)-(roleOrder.get(b.value)??ROLE_ORDER.length));
 const label=value.custom_relation||roles.find(r=>r.value===value.relation_role)?.label;
 const partner1Name=context.partner1_name?.trim()||'Bride';
 const partner2Name=context.partner2_name?.trim()||'Groom';
 const partner=value.relation_partner==='partner_one'?partner1Name:partner2Name;
 const savedCustomDisplay=!label&&value.relation_partner===context.guest?.relation_partner&&value.relation_role===context.guest?.relation_role?context.guest?.relation_display:'';
 const partners=context.relation_mode==='single'?['partner_one']:['partner_one','partner_two'];
 return <section className="space-y-2">
  <Label>Relation</Label><div className={styles.relationRow}><Input aria-label="Current relation" readOnly value={label?partner+' / '+label:savedCustomDisplay||'No relation set'} className={styles.relationControl}/><Button type="button" className={`lv-premium-btn ${styles.relationControl}`} onClick={()=>{setDraft(value);setOpen(true);}}>Assign Relation</Button></div>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className={`ww-public-live-dialog z-[11000] ${styles.relationDialog}`}><DialogHeader><DialogTitle>Assign Relation</DialogTitle><DialogDescription>Select partner and relationship</DialogDescription></DialogHeader><div className="space-y-4">
   <div className={styles.partnerGrid} data-partner-count={partners.length}>
    {partners.map(p=><div key={p} className="min-w-0 space-y-2"><p className={styles.partnerHeading}>{p==='partner_one'?partner1Name:partner2Name}</p><div className={styles.roleGrid}>{roles.map(r=><Button type="button" variant="ghost" className="w-full whitespace-normal h-auto min-h-9" aria-pressed={draft.relation_partner===p&&draft.relation_role===r.value} key={r.value} onClick={()=>setDraft({relation_partner:p,relation_role:r.value,custom_relation:''})}>{draft.relation_partner===p&&draft.relation_role===r.value?'✓ ':''}{r.label}</Button>)}</div></div>)}
   </div>
   <div className={styles.footerActions}><Button type="button" className={`bg-green-500 text-white ${styles.footerButton} ${styles.selectButton}`} disabled={!draft.relation_partner||!draft.relation_role} onClick={()=>{onChange(draft);setOpen(false);}}><Check aria-hidden="true" className="text-white" />Select</Button><Button type="button" className={`bg-red-500 text-white ${styles.footerButton} ${styles.cancelButton}`} onClick={()=>setOpen(false)}><X aria-hidden="true" className="text-white" />Cancel</Button></div>
  </div></DialogContent></Dialog>
 </section>;
}
