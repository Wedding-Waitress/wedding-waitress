import React from 'react';import{beforeEach,it,expect,vi}from'vitest';import{render,screen,waitFor,fireEvent,act}from'@testing-library/react';
const m=vi.hoisted(()=>({profile:{} as any,privateCopy:false,resolved:false,sourceBytes:'original event photo',privateBytes:'',buckets:[] as string[],toast:vi.fn()}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:m.toast})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 auth:{getUser:async()=>({data:{user:{id:'owner-1',email:'audit@example.com'}},error:null})},
 rpc:async()=>{if(m.resolved)return{data:{status:'skipped'},error:null};if(m.profile.profile_image_path){m.resolved=true;return{data:{status:'preserved'},error:null};}if(m.privateCopy){m.profile.profile_image_path='owner-1/profile-image';m.resolved=true;return{data:{status:'seeded'},error:null};}return{data:{status:'copy_required',source_path:'owner-1/drafts/draft-1/photo.jpg',target_path:'owner-1/profile-image'},error:null};},
 from:()=>{let update:any;const q:any={select:()=>q,eq:()=>q,update:(p:any)=>{update=p;return q;},single:async()=>({data:{...m.profile},error:null}),then:(resolve:any)=>{if(update)Object.assign(m.profile,update);return Promise.resolve({data:null,error:null}).then(resolve);}};return q;},
 storage:{from:(bucket:string)=>{m.buckets.push(bucket);return{download:async()=>({data:new Blob([m.sourceBytes],{type:'image/jpeg'}),error:null}),upload:async(_p:string,blob:Blob)=>{m.privateCopy=true;m.privateBytes=await blob.text();return{error:null};},createSignedUrl:async(path:string)=>({data:{signedUrl:'https://private-profile.test/'+path},error:null}),remove:async()=>{m.privateCopy=false;m.privateBytes='';return{error:null};}};}}
}}));
import{seedOnboardingProfileImage}from'./onboardingProfileImage';import{clearAllCaches}from'./cacheRegistry';import{useProfile}from'@/hooks/useProfile';import{ProfileImageEditor}from'@/components/Account/ProfileImageEditor';
const draft:any={id:'draft-1',user_id:'owner-1',mode:'first_event',answers:{eventImagePath:'owner-1/drafts/draft-1/photo.jpg'},completed_at:null};
function Account(){const{refreshProfile}=useProfile();return <><button onClick={()=>void refreshProfile()}>Refresh account profile</button><ProfileImageEditor/></>}
beforeEach(()=>{clearAllCaches();m.profile={id:'owner-1',first_name:'Audit',last_name:'Person',email:'audit@example.com',profile_image_path:null,profile_image_fit:'cover',profile_image_position_x:50,profile_image_position_y:50};m.privateCopy=false;m.resolved=false;m.privateBytes='';m.buckets=[];vi.spyOn(window,'confirm').mockReturnValue(true);});
it('shows the automatic private copy in Account Info, refreshes an already loaded cache, persists on reload and removes independently',async()=>{
 const view=render(<Account/>);await screen.findByRole('button',{name:'Choose Image'});
 await act(async()=>{await seedOnboardingProfileImage(draft);});fireEvent.click(screen.getByRole('button',{name:'Refresh account profile'}));
 const image=await screen.findByRole('img');expect(image).toHaveAttribute('src','https://private-profile.test/owner-1/profile-image');expect(screen.getByRole('button',{name:'Replace Image'})).toBeInTheDocument();expect(m.privateBytes).toBe(m.sourceBytes);
 view.unmount();clearAllCaches();render(<Account/>);expect(await screen.findByRole('img')).toHaveAttribute('src','https://private-profile.test/owner-1/profile-image');
 fireEvent.click(screen.getByRole('button',{name:'Remove'}));await waitFor(()=>expect(m.profile.profile_image_path).toBeNull());await waitFor(()=>expect(screen.queryByRole('img')).not.toBeInTheDocument());expect(m.sourceBytes).toBe('original event photo');
 await seedOnboardingProfileImage(draft);expect(m.profile.profile_image_path).toBeNull();expect(m.privateCopy).toBe(false);
});
