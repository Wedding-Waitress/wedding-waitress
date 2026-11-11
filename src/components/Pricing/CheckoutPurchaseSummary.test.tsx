import React from 'react';
import {render,screen} from '@testing-library/react';import {describe,it,expect} from 'vitest';
import {CheckoutPurchaseSummary} from './CheckoutPurchaseSummary';import {promotionPreview} from '../../../supabase/functions/_shared/promotionRules';
describe('purchase summary before Stripe consent',()=>{
 it.each([50,51,60,100])('shows exact verified %s percent totals and credits',percent=>{
  const quote=promotionPreview('essential',percent);render(<CheckoutPurchaseSummary planKey="essential" purpose="new_plan" baseAmount={199} offer={{code:'TEST',percent,subtotalCents:quote.subtotalCents,includedCredits:quote.includedCredits}} awaitingOffer={false}/>);
  expect(screen.getByText('1 event included')).toBeInTheDocument();expect(screen.getByText(percent+'% off')).toBeInTheDocument();
  expect(screen.getByText(quote.includedCredits+' included')).toBeInTheDocument();
  expect(screen.getByText({50:'A$109.45',51:'A$107.26',60:'A$87.56',100:'A$0.00'}[percent])).toBeInTheDocument();
 });
 it('does not imply a total or included allowance for an unverified code',()=>{
  render(<CheckoutPurchaseSummary planKey="essential" purpose="new_plan" baseAmount={199} offer={null} awaitingOffer/>);
  expect(screen.getByText('Awaiting code verification')).toBeInTheDocument();expect(screen.queryByText('150 included')).not.toBeInTheDocument();expect(screen.queryByText('A$218.90')).not.toBeInTheDocument();
 });
 it('shows a normal package with no discount',()=>{
  render(<CheckoutPurchaseSummary planKey="premium" purpose="new_plan" baseAmount={249} offer={null} awaitingOffer={false}/>);
  expect(screen.getByText('A$273.90')).toBeInTheDocument();expect(screen.getByText('250 included')).toBeInTheDocument();
 });
 it('does not promise another event or new credit allowance for an upgrade',()=>{
  render(<CheckoutPurchaseSummary planKey="premium" purpose="upgrade" baseAmount={50} offer={null} awaitingOffer={false}/>);
  expect(screen.getByText('Existing event retained')).toBeInTheDocument();expect(screen.getByText('Existing credit balance retained')).toBeInTheDocument();expect(screen.getByText('A$55.00')).toBeInTheDocument();
 });
});