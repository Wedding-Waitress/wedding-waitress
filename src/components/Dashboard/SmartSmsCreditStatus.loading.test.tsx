import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const creditState = vi.hoisted(() => ({loading:true,error:null as string|null,eligibility:{status:'eligible',message:''},retry:vi.fn()}));
beforeEach(()=>{creditState.error=null;creditState.eligibility={status:'eligible',message:''};});
vi.mock('@/hooks/useSmsCredits',()=>({useSmsCredits:()=>({loading:creditState.loading,error:creditState.error,refetch:vi.fn(),credits:{total:450,used:6,remaining:444}})}));
vi.mock('@/hooks/useSmsTopup',()=>({useSmsTopup:()=>({startTopup:vi.fn(),loading:false,eligibility:creditState.eligibility,retryEligibility:creditState.retry})}));
vi.mock('@/contexts/PaymentProcessingContext',()=>({usePaymentProcessing:()=>({processing:false})}));
import {SmartSmsCreditStatus} from './SmartSmsCreditStatus';
afterEach(cleanup);
describe('shared credit loading state',()=>{
 it('does not show an inactive account or top-up control while the saved balance loads',()=>{
  creditState.loading=true;
  render(<SmartSmsCreditStatus eventId="event"/>);
  expect(screen.getByRole('status')).toHaveTextContent('Loading credits');
  expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
 });
 it('shows the existing balance and compact controls after loading',()=>{
  creditState.loading=false;
  render(<SmartSmsCreditStatus eventId="event" variant="compact"/>);
  expect(screen.getByText('444 Email & SMS Credits Remaining')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Top Up'})).toBeEnabled();
 });
});

it.each(['full','compact'] as const)('keeps %s top-up unavailable when purchase eligibility is unknown or denied',variant=>{
 creditState.loading=false;
 creditState.eligibility={status:'loading',message:'Checking credit purchase eligibility…'};
 const view=render(<SmartSmsCreditStatus eventId="event" variant={variant}/>);
 expect(screen.getByRole('button',{name:variant==='full'?'Top-Up Credits +100':'Top Up'})).toBeDisabled();
 expect(screen.getByText('Checking credit purchase eligibility…')).toBeInTheDocument();
 creditState.eligibility={status:'ineligible',message:'Credit top-ups require an active Essential, Premium or Ultimate plan.'};
 view.rerender(<SmartSmsCreditStatus eventId="event" variant={variant}/>);
 expect(screen.getByRole('button',{name:variant==='full'?'Top-Up Credits +100':'Top Up'})).toBeDisabled();
 expect(screen.getByRole('link',{name:'Review account and plan'})).toHaveAttribute('href','/dashboard?tab=account');
 creditState.eligibility={status:'error',message:'Eligibility unavailable'};
 view.rerender(<SmartSmsCreditStatus eventId="event" variant={variant}/>);
 expect(screen.getByRole('button',{name:'Retry eligibility check'})).toBeInTheDocument();
});
it('shows a credit balance error instead of a healthy balance or checkout button',()=>{
 creditState.loading=false;creditState.error='Credit balance unavailable';
 render(<SmartSmsCreditStatus eventId="event"/>);
 expect(screen.getByRole('status')).toHaveTextContent('Credit balance unavailable');
 expect(screen.queryByRole('button',{name:'Top-Up Credits +100'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Retry credit balance'})).toBeInTheDocument();
});
