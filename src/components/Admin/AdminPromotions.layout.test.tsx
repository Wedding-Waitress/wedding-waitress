import React from 'react';
import {fireEvent,render,screen,within} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import {AdminPromotions} from './AdminPromotions';
const invoke=vi.hoisted(()=>vi.fn());
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke}}}));
beforeEach(()=>invoke.mockReset());
it.each([true,false])('shows all nine labelled segments and ordered status/Delete controls (active=%s)',async active=>{
 invoke.mockResolvedValue({data:{success:true,data:[{id:'fixture',code:'PARTNER',campaign_name:'Venue launch',percent_off:75,active,audience_version:2,audience:'venue_partner',bound_account_id:'account',bound_account_name:'Example Venue',bound_account_email:'venue@example.test',usage_limit:10,used:2,reserved:3,remaining:5}]}});
 render(<AdminPromotions/>);fireEvent.click(screen.getByRole('button',{name:'Load campaigns'}));
 await screen.findByRole('definition',{name:'Campaign name'});
 for(const [label,value] of [['Campaign name','Venue launch'],['Promo code','PARTNER'],['Discount','75%'],['Status',active?'Active':'Paused'],['Audience','Venue / Partner'],['Allocated','10'],['Used','2'],['Reserved','3'],['Remaining','5']])expect(screen.getByRole('definition',{name:label})).toHaveTextContent(value);
 expect(screen.getByRole('definition',{name:'Audience'})).toHaveTextContent('Example Venue · venue@example.test');
 const row=screen.getByRole('listitem');expect(within(row.querySelector('.ww-promotion-actions') as HTMLElement).getAllByRole('button').map(el=>el.textContent)).toEqual([active?'Pause':'Reactivate','Delete']);
});
it('shows uncapped legacy values without inventing numeric allocations',async()=>{
 invoke.mockResolvedValue({data:{success:true,data:[{id:'legacy',code:'LEGACY',campaign_name:'Legacy',percent_off:50,active:false,audience_version:2,audience:'general',usage_limit:null,used:0,reserved:0,remaining:null}]}});
 render(<AdminPromotions/>);fireEvent.click(screen.getByRole('button',{name:'Load campaigns'}));
 expect(await screen.findByRole('definition',{name:'Allocated'})).toHaveTextContent('Uncapped (legacy)');
 expect(screen.getByRole('definition',{name:'Remaining'})).toHaveTextContent('Uncapped (legacy)');
 expect(screen.getByRole('definition',{name:'Used'})).toHaveTextContent('0');
});
it('labels missing usage as unavailable',async()=>{
 invoke.mockResolvedValue({data:{success:true,data:[{id:'old',code:'OLD',campaign_name:'Old',percent_off:50,active:true}]}});
 render(<AdminPromotions/>);fireEvent.click(screen.getByRole('button',{name:'Load campaigns'}));
 expect(await screen.findByRole('definition',{name:'Audience'})).toHaveTextContent('Legacy campaign');
 for(const label of ['Allocated','Used','Reserved','Remaining'])expect(screen.getByRole('definition',{name:label})).toHaveTextContent('Unavailable');
});
