/** Independent reads run together only after the caller validates the share token. */
export async function loadFloorPlanAndEvent(db: any, link: any) {
 const [plan,event] = await Promise.all([
  db.from(link.kind === 'ceremony' ? 'ceremony_floor_plans' : 'reception_floor_plans').select('*').eq('event_id',link.event_id).eq('user_id',link.user_id).single(),
  db.from('events').select('name,date,venue,partner1_name,partner2_name,start_time,finish_time,ceremony_date,ceremony_venue,ceremony_start_time,ceremony_finish_time').eq('id',link.event_id).single(),
 ]);
 return {plan,event};
}
export async function loadReceptionShareContent(db: any, link: any, plan: any, includeAssets: boolean) {
 const [rows,guests,background,draft] = await Promise.all([
  db.from('tables').select('id,name,table_no,limit_seats,table_type,table_purpose,head_seating_order').eq('event_id',link.event_id),
  db.from('guests').select('table_id,seat_no').eq('event_id',link.event_id),
  includeAssets && plan.background_image_url ? db.storage.from('reception-floor-plan-backgrounds').createSignedUrl(plan.background_image_url,3600) : Promise.resolve({data:null,error:null}),
  includeAssets && link.permission === 'can_edit' ? db.from('reception_collaborator_drafts').select('payload,revision,status,base_updated_at').eq('link_id',link.id).maybeSingle() : Promise.resolve({data:null,error:null}),
 ]);
 if(rows.error || guests.error) throw Error('Could not load tables');
 if(draft.error) throw draft.error;
 // Build the guest lookup once rather than scanning all guests twice per table.
 const occupants = new Map<string, {count:number;seats:number[]}>();
 for(const guest of guests.data??[]) {
  const entry = occupants.get(guest.table_id) ?? {count:0,seats:[]};
  entry.count++; if(guest.seat_no != null) entry.seats.push(guest.seat_no);
  occupants.set(guest.table_id,entry);
 }
 const tables = (rows.data??[]).map((table:any) => ({...table,guest_count:occupants.get(table.id)?.count??0,occupied_seat_numbers:occupants.get(table.id)?.seats??[]}));
 return {tables,backgroundUrl:background.data?.signedUrl??null,draft:draft.data};
}
