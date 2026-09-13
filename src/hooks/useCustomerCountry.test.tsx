import {renderHook,waitFor} from '@testing-library/react';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {useCustomerCountry} from './useCustomerCountry';
const mock=vi.hoisted(()=>({single:vi.fn(),update:vi.fn(),is:vi.fn(),fetch:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:mock.single})}),update:mock.update})}}));
describe('automatic country capture integration',()=>{
 beforeEach(()=>{mock.single.mockReset().mockResolvedValue({data:{country_code:null},error:null});mock.update.mockReset().mockReturnValue({eq:()=>({is:mock.is})});mock.is.mockReset().mockResolvedValue({error:null});mock.fetch.mockReset().mockResolvedValue(Response.json({country_code:'AU',source:'netlify-country'}));vi.stubGlobal('fetch',mock.fetch);});
 afterEach(()=>vi.unstubAllGlobals());
 it('captures only a missing country through own-profile RLS',async()=>{renderHook(()=>useCustomerCountry('fixture',true));await waitFor(()=>expect(mock.is).toHaveBeenCalledWith('country_code',null));expect(mock.update).toHaveBeenCalledWith({country_code:'AU'});});
 it('does not overwrite recorded country',async()=>{mock.single.mockResolvedValue({data:{country_code:'NZ'},error:null});renderHook(()=>useCustomerCountry('fixture',true));await waitFor(()=>expect(mock.single).toHaveBeenCalled());expect(mock.fetch).not.toHaveBeenCalled();expect(mock.update).not.toHaveBeenCalled();});
 it('does not mistake SPA HTML for detection JSON',async()=>{mock.fetch.mockResolvedValue(new Response('<html>SPA</html>',{headers:{'content-type':'text/html'}}));renderHook(()=>useCustomerCountry('fixture',true));await waitFor(()=>expect(mock.fetch).toHaveBeenCalled());expect(mock.update).not.toHaveBeenCalled();});
 it('does not run before coordinated activation or without a user',()=>{renderHook(()=>useCustomerCountry('fixture',false));renderHook(()=>useCustomerCountry(null,true));expect(mock.single).not.toHaveBeenCalled();});
});
