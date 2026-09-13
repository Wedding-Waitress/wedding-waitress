import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { EventBudgetData } from '@/hooks/useEventBudget';
import { AdminReadOnlyBudget } from './AdminReadOnlyBudget';
const mocks=vi.hoisted(()=>({hook:vi.fn(),pdf:vi.fn()}));
vi.mock('@/hooks/useEventBudget',()=>({useEventBudget:mocks.hook}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
vi.mock('@/lib/eventBudgetPdfExporter',()=>({exportEventBudgetPdf:mocks.pdf}));
const budget:EventBudgetData={settings:null,expenses:[{
 id:'expense',event_id:'event',user_id:'customer',category:'Catering',custom_category:null,
 expense_name:'Dinner',vendor_name:'Harbour Catering',contact_person:'Élodie O’Connor',phone:'0400000000',
 email:'fixture@example.test',address:'Recorded address',estimated_cost:1200,actual_cost:1300,amount_paid:300,
 payment_date:'2026-08-20',balance_due_date:'2026-12-01',notes:'Actual saved notes',display_order:0,
 created_at:'2026-08-20T00:00:00Z',updated_at:'2026-08-20T00:00:00Z',
}]};
beforeEach(()=>{vi.clearAllMocks();mocks.pdf.mockResolvedValue(undefined);});
it('uses saved budget data without organizer queries or editing controls',()=>{
 render(<AdminReadOnlyBudget budget={budget} event={{id:'event',name:'Saved event'}}/>);
 expect(mocks.hook).not.toHaveBeenCalled();
 expect(screen.getByRole('button',{name:'Save Budget'})).toBeDisabled();
 expect(screen.getByLabelText('Total Anticipated Event Budget')).toBeDisabled();
 expect(screen.getByRole('button',{name:'Add Expense'})).toBeDisabled();
 screen.getAllByRole('button',{name:/Edit.*Catering|Edit.*Harbour|Edit.*Dinner/}).forEach(button=>expect(button).toBeDisabled());
 expect(screen.getByText('Actual saved notes')).toBeInTheDocument();
 expect(within(screen.getByRole('region',{name:'Saved expense details'})).getByText(/Élodie O’Connor/)).toBeInTheDocument();
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('exports the same existing printable renderer, not a separate admin document',async()=>{
 render(<AdminReadOnlyBudget budget={budget} event={{id:'event',name:'Saved event'}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));
 await waitFor(()=>expect(mocks.pdf).toHaveBeenCalled());
 const root=screen.getByRole('dialog').querySelector('[data-budget-print-document-root]');
 expect(mocks.pdf).toHaveBeenCalledWith(root,'Saved event');
 expect(mocks.hook).not.toHaveBeenCalled();
});
it('reports absent preview data without inventing a new budget',()=>{
 render(<AdminReadOnlyBudget budget={undefined} event={{id:'event',name:'Saved event'}}/>);
 expect(screen.getByText('Saved Budget Planner preview data is unavailable.')).toBeInTheDocument();
 expect(mocks.hook).not.toHaveBeenCalled();expect(mocks.pdf).not.toHaveBeenCalled();
});
