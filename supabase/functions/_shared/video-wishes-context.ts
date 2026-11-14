/** Server-only identity resolution. General names never confer guest permissions. */
export async function resolveVideoWishesContext(db: any, slug: string, invitationToken?: string, password='') {
  const {data:event,error:eventError} = await db.from('events').select('id,user_id,name,date,slug').eq('slug',slug).maybeSingle();
  if(eventError || !event) throw new Error('Event not found');
  // These reads all depend only on the event. Run them together; every result
  // still passes the same fail-closed checks before any context is returned.
  const [access, plan, settingResult, galleryResult, limitResult] = await Promise.all([
    db.rpc('is_account_operational',{p_user_id:event.user_id}),
    db.rpc('subscription_allows_event_edit',{owner_id:event.user_id}),
    db.from('video_wishes_settings').select('enabled').eq('event_id',event.id).maybeSingle(),
    db.from('event_media_galleries').select('id,is_open,password_enabled').eq('event_id',event.id).maybeSingle(),
    db.from('event_media_limits').select('max_video_bytes,max_video_duration_sec').eq('event_id',event.id).maybeSingle(),
  ]);
  const {data:operational,error:accessError} = access;
  if(accessError || operational !== true) throw new Error('Video Wishes is unavailable for this event');
  const {data:editable,error:planError}=plan;
  if(planError || editable !== true) throw new Error('Video uploads are unavailable for this event');
  const {data:settings,error:settingsError} = settingResult;
  if(settingsError || settings?.enabled !== true) throw new Error('Video Wishes is not displayed for this event');
  const {data:gallery,error:galleryError} = galleryResult;
  if(galleryError || !gallery?.is_open) throw new Error('The event gallery is closed');
  if(gallery.password_enabled) {
    const {data:galleryToken,error:galleryTokenError}=await db.from('event_media_upload_tokens').select('token,expires_at').eq('gallery_id',gallery.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(galleryTokenError || !galleryToken || (galleryToken.expires_at && Date.parse(galleryToken.expires_at)<=Date.now())) throw new Error('Video Wishes is unavailable for this event');
    const {data:passwordOk,error:passwordError}=await db.rpc('verify_event_media_password',{_token:galleryToken.token,_password:password});
    if(passwordError || passwordOk!==true) throw new Error('PASSWORD_REQUIRED');
  }
  const {data:limits,error:limitsError} = limitResult;
  if(limitsError || !limits) throw new Error('The event upload limits could not be checked');
  const maxBytes=Math.min(100*1024*1024,Number(limits.max_video_bytes));
  const maxSeconds=Math.min(120,Number(limits.max_video_duration_sec));
  if(!Number.isFinite(maxBytes)||maxBytes<1||!Number.isFinite(maxSeconds)||maxSeconds<1) throw new Error('Video uploads are unavailable');
  let recipient:any=null;
  let members:any[]=[];
  if(invitationToken) {
    const {data:token,error:tokenError} = await db.from('guest_access_tokens').select('guest_id,event_id,expires_at').eq('access_token',invitationToken).eq('event_id',event.id).gt('expires_at',new Date().toISOString()).maybeSingle();
    if(tokenError || !token) throw new Error('Your personal invitation is no longer valid. Please reopen your invitation.');
    const {data:guest,error:guestError}=await db.from('guests').select('id,first_name,last_name,family_group').eq('id',token.guest_id).eq('event_id',event.id).maybeSingle();
    if(guestError || !guest) throw new Error('Invitation guest not found');
    recipient=guest;
    members=[guest];
    if(typeof guest.family_group==='string' && guest.family_group.trim()) {
      const {data:family,error:familyError}=await db.from('guests').select('id,first_name,last_name,family_group').eq('event_id',event.id).eq('family_group',guest.family_group).order('created_at');
      if(familyError) throw new Error('Your invitation group could not be loaded');
      members=family;
    }
  }
  return {event,gallery,maxBytes,maxSeconds,recipient,members};
}

export function resolveWishSender(context:Awaited<ReturnType<typeof resolveVideoWishesContext>>,selection:unknown,name:unknown) {
  if(context.recipient) {
    const selected=typeof selection==='string'?selection:context.recipient.id;
    if(selected==='family') {
      if(!context.recipient.family_group?.trim() || context.members.length<2) throw new Error('This invitation has no family group');
      return {guest_id:null,invitation_guest_id:context.recipient.id,family_group:context.recipient.family_group,identity_type:'invitation_family',name:'Our family — '+context.recipient.family_group};
    }
    const member=context.members.find(guest=>guest.id===selected);
    if(!member) throw new Error('This person is not authorised by your invitation');
    return {guest_id:member.id,invitation_guest_id:context.recipient.id,family_group:member.family_group,identity_type:'invitation_guest',name:[member.first_name,member.last_name].filter(Boolean).join(' ').trim()};
  }
  if(selection && selection!=='general') throw new Error('A personal invitation is required to select a guest');
  const supplied=typeof name==='string'?name.trim():'';
  if(supplied.length<2 || supplied.length>120) throw new Error('Please enter your full name (2–120 characters)');
  return {guest_id:null,invitation_guest_id:null,family_group:null,identity_type:'guest_supplied',name:supplied};
}
