import type { SignageSettings } from '@/hooks/useSignageSettings';
export type SignageDesign = Omit<SignageSettings,'id'|'event_id'|'user_id'>;
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
export const sameDesign=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function signageDesign(settings:SignageSettings):SignageDesign{
 return clone({orientation:settings.orientation,background_color:settings.background_color,background_image_url:settings.background_image_url??null,background_image_print_url:settings.background_image_print_url??null,background_image_type:settings.background_image_type,background_image_x_position:settings.background_image_x_position,background_image_y_position:settings.background_image_y_position,background_image_opacity:settings.background_image_opacity,text_zones:settings.text_zones,qr_config:settings.qr_config,notes:settings.notes??''});
}
/** Each entry is the entire design, so restoring a deletion also restores all formatting and geometry. */
export class SignageDesignHistory<T = SignageDesign> {
 private past:T[]=[];private future:T[]=[];
 private group:string|null=null;private groupTime=0;
 present:T;
 constructor(initial:T,private limit=100){this.present=clone(initial);}
 get canUndo(){return this.past.length>0;}get canRedo(){return this.future.length>0;}
 breakGroup(){this.group=null;}
 record(next:T,group:string|null=null,now=Date.now()){
  if(sameDesign(this.present,next))return false;
  if(!group||this.group!==group||now-this.groupTime>800){this.past.push(clone(this.present));if(this.past.length>this.limit)this.past.shift();}
  this.present=clone(next);this.future=[];this.group=group;this.groupTime=now;return true;
 }
 undo(){if(!this.canUndo)return null;this.future.unshift(clone(this.present));this.present=this.past.pop()!;this.breakGroup();return clone(this.present);}
 redo(){if(!this.canRedo)return null;this.past.push(clone(this.present));this.present=this.future.shift()!;this.breakGroup();return clone(this.present);}
}
const changedKeys=(before:Record<string,unknown>,after:Record<string,unknown>)=>Object.keys(after).filter(key=>!sameDesign(before[key],after[key]));
/** Coalesce uninterrupted typing/sliders; add/delete, toggles and committed preview gestures remain separate. */
export function signageHistoryGroup(before:SignageDesign,after:SignageDesign):string|null{
 const keys=changedKeys(before as any,after as any);if(keys.length!==1)return null;const field=keys[0];
 if(field==='text_zones'){
  if(before.text_zones.length!==after.text_zones.length||before.text_zones.some((zone,i)=>zone.id!==after.text_zones[i].id))return null;
  const changed=after.text_zones.filter((zone,i)=>!sameDesign(zone,before.text_zones[i]));if(changed.length!==1)return null;
  const zone=changed[0],old=before.text_zones.find(item=>item.id===zone.id)!;const fields=changedKeys(old as any,zone as any);
  return fields.length===1&&['text','font_size','font_color','x_percent','y_percent','width_percent','rotation'].includes(fields[0])?'zone:'+zone.id+':'+fields[0]:null;
 }
 if(field==='qr_config'){const fields=changedKeys(before.qr_config as any,after.qr_config as any);return fields.length===1&&['x_percent','y_percent','size_percent','rotation'].includes(fields[0])?'qr:'+fields[0]:null;}
 return ['notes','background_color','background_image_x_position','background_image_y_position','background_image_opacity'].includes(field)?field:null;
}
