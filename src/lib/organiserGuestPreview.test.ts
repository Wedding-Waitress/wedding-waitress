import {it,expect,vi} from 'vitest';
import {loadOrganiserGuestPreview,createGuestPreviewClient,type GuestPreviewSnapshot} from './organiserGuestPreview';
const event={id:'event',user_id:'owner',slug:'saved-wedding',name:'Saved Wedding',date:'2030-03-19'};
function client(user:any={id:'owner'},allowed=true){
 const reads:string[]=[];
 const rows:any={events:event,guests:[{id:'guest',event_id:'event',user_id:'owner',first_name:'Alex',last_name:'Smith',table_id:'table',seat_no:4}],tables:[{id:'table',event_id:'event',user_id:'owner',name:'Bridal Table',limit_seats:6,table_purpose:'head'}]};
 const api:any={auth:{getUser:vi.fn().mockResolvedValue({data:{user},error:null})},rpc:vi.fn().mockResolvedValue({data:allowed,error:null}),from:vi.fn((table:string)=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,range:()=>q,single:()=>q,maybeSingle:()=>q,then:(resolve:any)=>{reads.push(table);return Promise.resolve({data:rows[table]??null,error:null}).then(resolve)}};return q;})};return{api,reads,rows};
}
it('denies anonymous access before reading any customer records',async()=>{const x=client(null);await expect(loadOrganiserGuestPreview('event',x.api)).rejects.toThrow('Sign in');expect(x.api.rpc).not.toHaveBeenCalled();expect(x.api.from).not.toHaveBeenCalled();});
it('denies another account or tampered event through the authoritative access function',async()=>{const x=client({id:'other'},false);await expect(loadOrganiserGuestPreview('event',x.api)).rejects.toThrow('organiser access');expect(x.api.rpc).toHaveBeenCalledWith('can_access_event',{_user_id:'other',_event_id:'event'});expect(x.api.from).not.toHaveBeenCalled();});
it('uses existing event, guest, table and module state without inserting defaults',async()=>{const x=client();const data=await loadOrganiserGuestPreview('event',x.api);expect(data.event).toEqual(event);expect(data.guests[0].seat_no).toBe(4);expect(data.modules).toEqual({});expect(x.api.auth.getUser).toHaveBeenCalledTimes(2);expect(x.reads).toContain('live_view_module_settings');});
it('permits an organiser/admin only when server permission and scoped reads both succeed',async()=>{const x=client({id:'admin'});await expect(loadOrganiserGuestPreview('event',x.api)).resolves.toBeDefined();x.rows.guests[0].event_id='other';await expect(loadOrganiserGuestPreview('event',x.api)).rejects.toThrow('scope');});
it('rejects session changes while the snapshot is loading',async()=>{const x=client();x.api.auth.getUser.mockResolvedValueOnce({data:{user:{id:'owner'}}}).mockResolvedValueOnce({data:{user:{id:'other'}}});await expect(loadOrganiserGuestPreview('event',x.api)).rejects.toThrow('session changed');});
it('has a closed read-only adapter: no SMS, verification session, mutations or cross-event reads',async()=>{
 const x=client(),snapshot=await loadOrganiserGuestPreview('event',x.api),api=createGuestPreviewClient(snapshot);x.api.rpc.mockClear();x.api.from.mockClear();
 for(const method of ['qr_guest_save_details','qr_guest_save_rsvps','save_guest_details_form','submit_guest_song_requests','qr_guest_verified_party','unknown'])expect((await api.rpc(method,{_event_id:'event'})).error).toBeTruthy();
 expect((await api.functions.invoke()).error).toBeTruthy();expect(()=>api.from()).toThrow('cannot access');
 expect((await api.rpc('qr_guest_public_event',{event_slug:'other'})).error).toBeTruthy();expect((await api.rpc('get_public_table_data',{p_event_id:'other',p_table_id:'table'})).error).toBeTruthy();
 expect((await api.rpc('get_public_table_data',{p_event_id:'event',p_table_id:'table'})).data[0]).toMatchObject({guest_id:'guest',guest_seat_no:4,table_name:'Bridal Table'});
 const result=await api.rpc('qr_guest_public_event',{event_slug:event.slug});result.data[0].guest_first_name='Changed';expect(snapshot.guests[0].first_name).toBe('Alex');expect(x.api.rpc).not.toHaveBeenCalled();expect(x.api.from).not.toHaveBeenCalled();
});
