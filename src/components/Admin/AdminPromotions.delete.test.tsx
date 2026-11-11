import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AdminPromotions } from './AdminPromotions';
const invoke=vi.hoisted(()=>vi.fn());
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke}}}));
const campaign={expiry_version:1,expiry_date:null,expires_at:null,id:'00000000-0000-4000-8000-000000000002',code:'EXAMPLE',campaign_name:'Example campaign',percent_off:50,active:true};
beforeEach(()=>{invoke.mockReset();sessionStorage.clear();sessionStorage.setItem('ww_admin_grant','proof');sessionStorage.setItem('ww_admin_grant_sig','signature');});
async function load(active=true) {
 invoke.mockResolvedValueOnce({data:{success:true,data:[{...campaign,active}]}});
 render(<AdminPromotions/>);fireEvent.click(screen.getByRole('button',{name:'Load campaigns'}));
 fireEvent.click(await screen.findByRole('button',{name:'Delete campaign Example campaign'}));
 return screen.getByRole('alertdialog');
}
it.each([true,false])('offers named deletion beside the status action for active=%s and allows cancellation',async(active)=>{
 const dialog=await load(active);
 expect(screen.getByRole('button',{name:active?'Pause':'Reactivate',hidden:true})).toBeInTheDocument();
 expect(dialog).toHaveAccessibleName('Delete campaign “Example campaign”?');
 expect(dialog).toHaveTextContent('Existing checkout reservations may still complete');
 fireEvent.click(within(dialog).getByRole('button',{name:'Cancel'}));
 expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();expect(invoke).toHaveBeenCalledTimes(1);
});
it('deletes only after confirmation, sends current verification and removes only the confirmed campaign',async()=>{
 const dialog=await load();
 let finish: (value:unknown)=>void=()=>{};
 invoke.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 fireEvent.click(within(dialog).getByRole('button',{name:'Delete campaign'}));
 expect(within(dialog).getByRole('button',{name:'Deleting…'})).toBeDisabled();
 expect(within(dialog).getByRole('button',{name:'Cancel'})).toBeDisabled();
 expect(invoke).toHaveBeenLastCalledWith('admin-promotions',{body:{action:'delete',id:campaign.id,admin_grant:'proof',admin_grant_signature:'signature'}});
 finish({data:{success:true,data:{...campaign,active:false,deleted_at:'2026-10-30T00:00:00Z'}}});
 expect(await screen.findByRole('status')).toHaveTextContent('Deleted campaign “Example campaign”.');
 expect(screen.queryByRole('button',{name:'Delete campaign Example campaign'})).not.toBeInTheDocument();
});
it.each([
 {data:{error:'Recent administrator verification required.'}},
 {data:{success:true,data:campaign}},
 {data:{success:true,data:{...campaign,id:'wrong',active:false,deleted_at:'2026-10-30'}}},
])('retains the row and confirmation when deletion fails or is not confirmed',async(response)=>{
 const dialog=await load();invoke.mockResolvedValueOnce(response);
 fireEvent.click(within(dialog).getByRole('button',{name:'Delete campaign'}));
 await waitFor(()=>expect(within(dialog).getByRole('alert')).toBeInTheDocument());
 expect(screen.getByRole('button',{name:'Delete campaign Example campaign',hidden:true})).toBeInTheDocument();
 expect(within(dialog).getByRole('button',{name:'Delete campaign'})).toBeEnabled();
});
it('provides Delete for campaigns created in the current session',async()=>{
 invoke.mockResolvedValue({data:{success:true,data:{...campaign,audience_version:2}}});render(<AdminPromotions/>);
 fireEvent.change(screen.getByLabelText('Campaign name'),{target:{value:campaign.campaign_name}});
 fireEvent.change(screen.getByLabelText('Promo code'),{target:{value:campaign.code}});
 fireEvent.click(screen.getByRole('button',{name:'Create promo code'}));
 expect(await screen.findByRole('button',{name:'Delete campaign Example campaign'})).toBeInTheDocument();
});
