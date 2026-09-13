import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {describe,expect,it} from 'vitest';
import {AdminCustomerAccountStatus} from './AdminCustomerAccountStatus';
describe('compact truthful account status details',()=>{
 it('keeps badge unchanged and moves full supporting wording into click/keyboard-dismissable content',async()=>{
  const detail='Deletion is scheduled for 12 Sept 2027. This account can be restored before that deadline.';
  render(<AdminCustomerAccountStatus status='Deleted' customerName='Customer' detail={detail}/>);
  expect(screen.getByText('Deleted')).toHaveAttribute('data-access-colour','red');
  expect(screen.queryByText(detail)).not.toBeInTheDocument();
  const trigger=screen.getByRole('button',{name:'Account details for Customer'});
  expect(trigger).toHaveAttribute('aria-expanded','false');fireEvent.click(trigger);
  expect(await screen.findByText(detail)).toBeInTheDocument();expect(trigger).toHaveAttribute('aria-expanded','true');
  expect(screen.getByRole('dialog')).toHaveStyle({maxWidth:'calc(100vw - 24px)'});
  fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});
  await waitFor(()=>expect(screen.queryByText(detail)).not.toBeInTheDocument());
 });
 it('has no empty popover for states without supporting details',()=>{
  render(<AdminCustomerAccountStatus status='Active' customerName='Customer'/>);
  expect(screen.getByText('Active')).toHaveAttribute('data-access-colour','green');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
 });
});
