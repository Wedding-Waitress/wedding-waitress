import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBudgetPlannerView, type BudgetPlannerController } from './EventBudgetPlanner';
import type { EventBudgetExpense } from '@/lib/eventBudget';
vi.mock('@/hooks/useEventBudget',()=>({useEventBudget:vi.fn()}));
vi.mock('@/lib/eventBudgetPdfExporter',()=>({exportEventBudgetPdf:vi.fn()}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
const item={id:'fixture-expense',event_id:'fixture-event',category:'Catering',vendor_name:'Fixture Caterer',estimated_cost:1200,actual_cost:1300,amount_paid:300} as EventBudgetExpense;
const remove=vi.fn();
const data={settings:{id:'fixture-budget',event_id:'fixture-event',anticipated_budget:5000,planned_budget_kind:'exact',currency:'AUD'},expenses:[item]} as any;
const controller=(current=data):BudgetPlannerController=>({query:{data:current,isLoading:false,isError:false,refetch:vi.fn()},saveBudget:{isPending:false,mutateAsync:vi.fn()},saveExpense:{isPending:false,mutateAsync:vi.fn()},deleteExpense:{isPending:false,mutateAsync:remove}});
const mount=(readOnly=false)=>render(<EventBudgetPlannerView event={{id:'fixture-event',name:'Fixture Gala'}} controller={controller()} readOnly={readOnly}/>);
const open=async()=>{fireEvent.click(within(screen.getByRole('table')).getByRole('button',{name:'Delete Fixture Caterer'}));return screen.findByRole('alertdialog');};
beforeEach(()=>{remove.mockReset().mockResolvedValue(item.id);});
describe('expense action pair',()=>{
 it('uses accessible icon-only edit/delete on table and mobile cards; cancellation never deletes',async()=>{
  mount();expect(screen.getAllByRole('button',{name:'Delete Fixture Caterer'})).toHaveLength(2);
  const pair=within(screen.getByRole('table')).getByRole('button',{name:'Edit Fixture Caterer'}).closest('[data-record-action-pair]')!;
  expect(pair.textContent).toBe('');
  const dialog=await open();expect(dialog).toHaveTextContent('Fixture Caterer will be permanently removed');
  fireEvent.click(within(dialog).getByRole('button',{name:'Cancel'}));expect(remove).not.toHaveBeenCalled();expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
 });
 it('retains the expense and confirmation on failure, then allows retry',async()=>{
  remove.mockRejectedValueOnce(new Error('Fixture delete unavailable'));mount();const dialog=await open();
  fireEvent.click(within(dialog).getByRole('button',{name:'Delete Expense'}));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Fixture delete unavailable');
  expect(document.querySelector('table button[aria-label="Delete Fixture Caterer"]')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button',{name:'Delete Expense'}));await waitFor(()=>expect(remove).toHaveBeenCalledTimes(2));
  await waitFor(()=>expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
 });
 it('blocks repeated confirmations and cancellation while the request is pending',async()=>{
  let finish!:(value:unknown)=>void;remove.mockImplementation(()=>new Promise(resolve=>{finish=resolve}));mount();const dialog=await open();
  const confirm=within(dialog).getByRole('button',{name:'Delete Expense'});fireEvent.click(confirm);fireEvent.click(confirm);
  expect(remove).toHaveBeenCalledTimes(1);expect(within(dialog).getByRole('button',{name:'Cancel'})).toBeDisabled();
  expect(within(dialog).getByRole('button',{name:'Deleting…'})).toBeDisabled();
  await act(async()=>{finish(item.id)});await waitFor(()=>expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
 });
 it('updates the visible list and all affected totals from the returned cache state',async()=>{
  function Fixture(){const[current,setCurrent]=React.useState(data);const c=controller(current);c.deleteExpense.mutateAsync=async id=>{remove(id);setCurrent({...current,expenses:[]});return id;};return <EventBudgetPlannerView event={{id:'fixture-event',name:'Fixture Gala'}} controller={c}/>;}
  render(<Fixture/>);const summary=screen.getByLabelText('Event budget summary');expect(summary).toHaveTextContent('$1,300.00');expect(summary).toHaveTextContent('$3,700.00');
  const dialog=await open();fireEvent.click(within(dialog).getByRole('button',{name:'Delete Expense'}));
  await screen.findByText('No expenses added yet');expect(summary).toHaveTextContent('$5,000.00');expect(summary).not.toHaveTextContent('$1,300.00');expect(screen.queryByRole('table')).not.toBeInTheDocument();
 });
 it('disables actions in read-only and legacy-currency budgets',()=>{
  const v=mount(true);expect(screen.getAllByRole('button',{name:'Delete Fixture Caterer'}).every(e=>(e as HTMLButtonElement).disabled)).toBe(true);
  v.rerender(<EventBudgetPlannerView event={{id:'fixture-event',name:'Fixture Gala'}} controller={controller({...data,settings:{...data.settings,currency:'USD'}})}/>);
  expect(screen.getAllByRole('button',{name:'Delete Fixture Caterer'}).every(e=>(e as HTMLButtonElement).disabled)).toBe(true);expect(remove).not.toHaveBeenCalled();
 });
});
