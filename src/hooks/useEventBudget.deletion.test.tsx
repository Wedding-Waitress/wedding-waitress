import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({from:vi.fn(),remove:vi.fn(),eq:vi.fn(),select:vi.fn(),single:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:m.from}}));
import { eventBudgetKeys, useEventBudget } from './useEventBudget';
const first={id:'fixture-one',event_id:'fixture-event',actual_cost:1300,amount_paid:300};
const second={id:'fixture-two',event_id:'fixture-event',actual_cost:200,amount_paid:0};
beforeEach(()=>{vi.clearAllMocks();const chain={delete:m.remove,eq:m.eq,select:m.select,single:m.single};m.from.mockReturnValue(chain);m.remove.mockReturnValue(chain);m.eq.mockReturnValue(chain);m.select.mockReturnValue(chain);m.single.mockResolvedValue({data:{id:first.id},error:null});});
const mount=()=>{const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});client.setQueryData(eventBudgetKeys.event('fixture-event'),{settings:null,expenses:[first,second]});client.setQueryData(eventBudgetKeys.event('other-event'),{settings:null,expenses:[{id:'other'}]});const wrapper=({children}:{children:React.ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;return{client,...renderHook(()=>useEventBudget('fixture-event'),{wrapper})};};
describe('expense deletion cache updates with mocked provider',()=>{
 it('deletes only the selected event expense and refreshes the observable expense list',async()=>{const{result,client}=mount();await act(async()=>{await result.current.deleteExpense.mutateAsync(first.id)});expect(m.from).toHaveBeenCalledWith('event_budget_expenses');expect(m.eq).toHaveBeenCalledWith('id',first.id);expect(m.eq).toHaveBeenCalledWith('event_id','fixture-event');await waitFor(()=>expect(result.current.query.data?.expenses).toEqual([second]));expect(client.getQueryData(eventBudgetKeys.event('other-event'))).toEqual({settings:null,expenses:[{id:'other'}]});});
 it.each([{data:null,error:new Error('Fixture denied')},{data:null,error:null}])('preserves cached expenses if deletion fails or affects no row',async response=>{m.single.mockResolvedValue(response);const{result,client}=mount();await act(async()=>{await expect(result.current.deleteExpense.mutateAsync(first.id)).rejects.toThrow()});expect((client.getQueryData(eventBudgetKeys.event('fixture-event')) as any).expenses).toEqual([first,second]);});
});
