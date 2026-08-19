import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DeleteAccountDialog } from './DeleteAccountDialog';

const mocks=vi.hoisted(()=>({send:vi.fn(),verify:vi.fn(),invoke:vi.fn(),signOut:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{signInWithOtp:mocks.send,verifyOtp:mocks.verify,signOut:mocks.signOut},functions:{invoke:mocks.invoke}}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));

describe('DeleteAccountDialog',()=>{
  it('explains retention and requires acknowledgement, confirmation text and recent authentication',async()=>{
    mocks.send.mockResolvedValue({error:null});mocks.verify.mockResolvedValue({error:null});
    render(<MemoryRouter><DeleteAccountDialog open onOpenChange={vi.fn()} email="owner@example.com"/></MemoryRouter>);
    expect(screen.getByText(/retained securely for 12 months/i)).toBeInTheDocument();
    expect(screen.getByText(/does not automatically create a refund/i)).toBeInTheDocument();
    const final=screen.getByRole('button',{name:'Delete My Account'});expect(final).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox',{name:/acknowledge/i}));
    fireEvent.change(screen.getByLabelText(/Type DELETE/i),{target:{value:'DELETE'}});
    fireEvent.click(screen.getByRole('button',{name:'Confirm recent authentication'}));
    await waitFor(()=>expect(mocks.send).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(/6-digit authentication code/i),{target:{value:'123456'}});
    fireEvent.click(screen.getByRole('button',{name:'Verify Code'}));
    await waitFor(()=>expect(mocks.verify).toHaveBeenCalled());
    expect(final).toBeEnabled();
  });
});
