import {describe,expect,it,vi} from 'vitest';
import {requirePlanningEventOwner} from '../../supabase/functions/_shared/team-planning-access';
describe('service-side planning identity',()=>{
 it('uses verified actor and requested event and returns the account owner',async()=>{
  const db={rpc:vi.fn().mockResolvedValue({data:'owner',error:null})};
  await expect(requirePlanningEventOwner(db,'member','event')).resolves.toBe('owner');
  expect(db.rpc).toHaveBeenCalledWith('internal_team_event_owner',{p_actor:'member',p_event:'event'});
 });
 it.each([{data:null,error:null},{data:'',error:null},{data:'owner',error:{message:'offline'}}])('fails closed on missing access or database failure',async result=>{
  await expect(requirePlanningEventOwner({rpc:vi.fn().mockResolvedValue(result)},'removed','event')).rejects.toThrow('unauthorized');
 });
});
