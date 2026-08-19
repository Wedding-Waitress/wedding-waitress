import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AdminOtpModal } from './AdminOtpModal';
const mocks=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke}}}));
describe('Admin Verification dialog',()=>{
  it('preserves the Twilio OTP functions, supports paste and stores a signed grant',async()=>{mocks.invoke.mockResolvedValueOnce({data:{masked_phone:'*******1234'},error:null}).mockResolvedValueOnce({data:{grant:'grant',signature:'signature'},error:null});render(<MemoryRouter><AdminOtpModal open onOpenChange={vi.fn()}/></MemoryRouter>);expect(await screen.findByText(/1234/)).toBeInTheDocument();const input=screen.getByLabelText('Six-digit verification code');fireEvent.paste(input,{clipboardData:{getData:()=> '12 34-56'}});expect(input).toHaveValue('123456');fireEvent.click(screen.getByRole('button',{name:'Verify'}));await waitFor(()=>expect(mocks.invoke).toHaveBeenLastCalledWith('admin-verify-otp',{body:{code:'123456'}}));expect(sessionStorage.getItem('ww_admin_grant_sig')).toBe('signature');});
  it('shows an honest incorrect-code message',async()=>{mocks.invoke.mockReset();mocks.invoke.mockResolvedValueOnce({data:{masked_phone:'***1234'},error:null}).mockResolvedValueOnce({data:{error:'Invalid code'},error:null});render(<MemoryRouter><AdminOtpModal open onOpenChange={vi.fn()}/></MemoryRouter>);const input=await screen.findByLabelText('Six-digit verification code');fireEvent.change(input,{target:{value:'111111'}});fireEvent.click(screen.getByRole('button',{name:'Verify'}));expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i);});
});
