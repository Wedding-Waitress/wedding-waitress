import React,{useMemo} from 'react';
import {EventBudgetPlannerView,type BudgetPlannerController,type BudgetPlannerEvent} from '@/components/Dashboard/EventBudgetPlanner/EventBudgetPlanner';
import type {EventBudgetData} from '@/hooks/useEventBudget';
const denyWrite=async()=>{throw new Error('Customer preview is read-only.');};
export function AdminReadOnlyBudget({budget,event}:{budget:EventBudgetData|undefined;event:BudgetPlannerEvent}) {
 const controller=useMemo<BudgetPlannerController>(()=>({query:{data:budget,isLoading:false,isError:false,refetch:async()=>undefined},
  saveBudget:{isPending:false,mutateAsync:denyWrite},saveExpense:{isPending:false,mutateAsync:denyWrite},deleteExpense:{isPending:false,mutateAsync:denyWrite}}),[budget]);
 if(!budget)return <p>Saved Budget Planner preview data is unavailable.</p>;
 return <section aria-label="Read-only Budget Planner"><EventBudgetPlannerView event={event} controller={controller} readOnly/>
  <section aria-label="Saved expense details"><h3>Saved expense details</h3>{budget.expenses.map(expense=><details key={expense.id}>
   <summary>{expense.vendor_name||expense.expense_name||expense.category}</summary>
   <p>{[expense.contact_person,expense.phone,expense.email,expense.address].filter(Boolean).join(' · ')||'No contact details recorded.'}</p>
   <p>{expense.notes||'No notes recorded.'}</p>
  </details>)}</section>
 </section>;
}
