import {act,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke},from:()=>{throw Error('Customer query forbidden');}}}));
import {AdminReadOnlyProfileArtwork} from './AdminReadOnlyProfileArtwork';
const artwork={user_id:'owner',first_name:'Élodie',last_name:'O’Connor',image_path:'owner/profile-image',fit:'contain',position_x:23,position_y:80};
describe('read-only private account artwork',()=>{
 beforeEach(()=>{mocks.invoke.mockReset();vi.stubEnv('VITE_SUPABASE_URL','https://isolated.test');});afterEach(()=>vi.unstubAllEnvs());
 it.each([undefined,{...artwork,user_id:'foreign'},{...artwork,image_path:42}])('does not infer missing or foreign profile artwork (%j)',artwork=>{
  render(<AdminReadOnlyProfileArtwork ownerId="owner" email="fixture@example.test" artwork={artwork}/>);
  expect(screen.getByText('Saved profile artwork information is unavailable.')).toBeInTheDocument();expect(mocks.invoke).not.toHaveBeenCalled();
 });
 it('preserves saved fit and position through the existing avatar renderer without upload/edit controls',async()=>{
  const signed='https://isolated.test/storage/v1/object/sign/profile-images/owner/profile-image?token=fixture';
  mocks.invoke.mockResolvedValue({data:{read_only:true,url:signed,expires_at:new Date(Date.now()+60000).toISOString()},error:null});
  render(<AdminReadOnlyProfileArtwork ownerId="owner" email="fixture@example.test" artwork={artwork}/>);
  const image=await screen.findByRole('img',{name:'Élodie O’Connor profile photo or business logo'});expect(image).toHaveAttribute('src',signed);
  expect(image).toHaveStyle({objectFit:'contain',objectPosition:'23% 80%'});expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(mocks.invoke).toHaveBeenCalledWith('admin-customer-preview-media',{body:expect.objectContaining({kind:'profile_image',customer_id:'owner',record_id:'owner',event_id:''})});
  mocks.invoke.mockImplementation(()=>new Promise(()=>{}));act(()=>window.dispatchEvent(new Event('focus')));expect(screen.queryByRole('img')).not.toBeInTheDocument();
 });
 it('does not fabricate absent historical crop geometry',()=>{
  render(<AdminReadOnlyProfileArtwork ownerId="owner" email="fixture@example.test" artwork={{...artwork,fit:null}}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('No replacement image has been substituted');expect(mocks.invoke).not.toHaveBeenCalled();
 });
 it('uses existing initials only when the saved record actually has no image',()=>{
  render(<AdminReadOnlyProfileArtwork ownerId="owner" email="fixture@example.test" artwork={{...artwork,image_path:null,fit:null,position_x:null,position_y:null}}/>);
  expect(screen.getByText('ÉO')).toBeInTheDocument();expect(screen.getByText(/No saved profile image/)).toBeInTheDocument();expect(mocks.invoke).not.toHaveBeenCalled();
 });
});
