import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({list:vi.fn(),insert:vi.fn(),single:vi.fn(),auth:vi.fn(),copy:vi.fn(),toast:vi.fn()}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:mocks.toast})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:mocks.auth},from:()=>{
 const chain:any={select:()=>chain,eq:()=>chain,order:mocks.list,insert:(data:any)=>{mocks.insert(data);return chain;},single:mocks.single};return chain;
}}}));
import {FloorPlanShareModal} from './FloorPlanShareModal';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it.each(['ceremony','reception'] as const)('copies a new %s link before the slow Manage request finishes and prevents duplicate inserts',async kind=>{
 let listResolve!:(v:any)=>void; mocks.list.mockImplementation(()=>new Promise(r=>listResolve=r));
 mocks.auth.mockResolvedValue({data:{user:{id:'owner'}}});
 mocks.single.mockResolvedValue({data:{id:'new',token:'d'.repeat(64),permission:'view_only',expires_at:'2099-01-01'},error:null});
 mocks.copy.mockResolvedValue(undefined);Object.defineProperty(navigator,'clipboard',{value:{writeText:mocks.copy},configurable:true});
 render(<React.StrictMode><FloorPlanShareModal open onOpenChange={()=>undefined} eventId="event" kind={kind}/></React.StrictMode>);
 const button=screen.getByRole('button',{name:'Generate & Copy Link'});
 fireEvent.click(button);fireEvent.click(button);
 expect(screen.getByRole('status')).toHaveTextContent('Generating share link...');
 await waitFor(()=>expect(mocks.copy).toHaveBeenCalledWith(window.location.origin+'/share/'+kind+'/'+'d'.repeat(64)));
 expect(mocks.insert).toHaveBeenCalledTimes(1);expect(mocks.list).toHaveBeenCalledTimes(1);
 expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({event_id:'event',user_id:'owner',permission:'view_only'}));
 await act(async()=>listResolve({data:[],error:null}));
 expect(screen.getByRole('tab',{name:'Manage (1)'})).toBeVisible();
});
it('retains a manual-copy field if the browser denies clipboard access',async()=>{
 mocks.list.mockResolvedValue({data:[],error:null});mocks.auth.mockResolvedValue({data:{user:{id:'owner'}}});
 mocks.single.mockResolvedValue({data:{id:'new',token:'manual'},error:null});mocks.copy.mockRejectedValue(Error('Denied'));
 Object.defineProperty(navigator,'clipboard',{value:{writeText:mocks.copy},configurable:true});
 render(<FloorPlanShareModal open onOpenChange={()=>undefined} eventId="event" kind="ceremony"/>);
 fireEvent.click(screen.getByRole('button',{name:'Generate & Copy Link'}));
 await waitFor(()=>expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Link ready'})));
 expect(screen.getByLabelText('Share link')).toHaveValue(window.location.origin+'/share/ceremony/manual');
 expect(screen.getByText('Select the link to copy it manually if automatic copying is unavailable.')).toBeVisible();
});
