
import {describe,it,expect} from 'vitest';
import {sanitizeDraft,requireEditor} from '../../supabase/functions/floor-plan-share/policy';
const plan={background_image_url:'owner/event/plan.png',table_positions:[{table_id:'table-1',note:'Keep this note'}],fixtures:[]};
const tables=[{id:'table-1',name:'Table 1',table_type:'round',table_purpose:'standard',limit_seats:8,guest_count:3,occupied_seat_numbers:[1,2,3]}];
const input=()=>({event_id:'other-event',user_id:'attacker',room_width_m:999,share_enabled:true,vendor_notes:'Leave the entrance clear.',manual_placement:true,table_positions:[{table_id:'table-1',x:2,y:3,rotation:0,locked:false,capacity:999,note:'overwrite'}],fixtures:[{id:'bar-1',type:'bar',x:1,y:2,width_m:4,height_m:1,rotation:0,locked:false}],background:{path:'foreign/path',x:0,y:0,width:20,height:35,rotation:0,opacity:1,visible:true,locked:false}});
describe('reception collaborator boundary',()=>{
 it.each(['save','submit','upload','trial','info'])('rejects view-only %s',action=>{expect(()=>requireEditor({kind:'reception',permission:'view_only'},action)).toThrow();expect(()=>requireEditor({kind:'ceremony',permission:'can_edit'},action)).toThrow();});
 it('permits scoped editors and view reads',()=>{expect(()=>requireEditor({kind:'reception',permission:'can_edit'},'save')).not.toThrow();expect(()=>requireEditor({kind:'ceremony',permission:'view_only'},'get')).not.toThrow();});
 it('keeps only layout fields and authoritative table information',()=>{const safe=sanitizeDraft(input(),plan,tables);expect(safe).not.toHaveProperty('event_id');expect(safe).not.toHaveProperty('user_id');expect(safe).not.toHaveProperty('room_width_m');expect(safe.table_positions[0].capacity).toBe(8);expect(safe.table_positions[0].note).toBe('Keep this note');expect(safe.background.path).toBe(plan.background_image_url);});
 it('rejects tables from another event and duplicate placements',()=>{let p=input();p.table_positions[0].table_id='foreign';expect(()=>sanitizeDraft(p,plan,tables)).toThrow();p=input();p.table_positions.push(p.table_positions[0]);expect(()=>sanitizeDraft(p,plan,tables)).toThrow();});
 it('rejects invalid fixture types and non-finite geometry',()=>{let p=input();p.fixtures[0].type='account';expect(()=>sanitizeDraft(p,plan,tables)).toThrow();p=input();p.fixtures[0].x=Infinity;expect(()=>sanitizeDraft(p,plan,tables)).toThrow();});
 it('cannot inject linked head tables or change table assignments',()=>{const p=input();Object.assign(p.fixtures[0],{linked_table_id:'foreign',linked_table_capacity:999});expect(sanitizeDraft(p,plan,tables).fixtures[0]).not.toHaveProperty('linked_table_id');});
 it('limits notes and converts background deletion to hiding the current image',()=>{const p=input();p.vendor_notes='x'.repeat(4001);expect(()=>sanitizeDraft(p,plan,tables)).toThrow();p.vendor_notes='';p.background.path=null as any;expect(sanitizeDraft(p,plan,tables).background.visible).toBe(false);});
});

it('allows Ceremony trial enquiries without granting editing access',()=>{const link={kind:'ceremony',permission:'view_only'};expect(()=>requireEditor(link,'trial')).not.toThrow();for(const action of ['save','submit','upload','info'])expect(()=>requireEditor(link,action)).toThrow();});
