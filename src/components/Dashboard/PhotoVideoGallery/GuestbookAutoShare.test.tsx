import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GuestbookAutoShare } from './GuestbookAutoShare';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
afterEach(() => { cleanup(); rpc.mockReset(); });
describe('Guestbook auto-sharing', () => {
 it('loads off and saves before showing enabled', async () => {
  rpc.mockResolvedValueOnce({data:false,error:null}).mockResolvedValueOnce({data:true,error:null});
  render(<GuestbookAutoShare eventId="event-one" />);
  const toggle=screen.getByRole('switch');
  await waitFor(()=>expect(toggle).toBeEnabled());
  expect(toggle).not.toBeChecked(); fireEvent.click(toggle);
  await waitFor(()=>expect(toggle).toBeChecked());
  expect(rpc).toHaveBeenLastCalledWith('set_guestbook_auto_share',{_event_id:'event-one',_enabled:true});
  expect(screen.getByText(/Turning this off only stops/)).toBeInTheDocument();
 });
 it('does not show a failed save as enabled',async()=>{
  rpc.mockResolvedValueOnce({data:false,error:null}).mockResolvedValueOnce({error:{message:'Failed'}});
  render(<GuestbookAutoShare eventId="event-one" />);
  const toggle=screen.getByRole('switch'); await waitFor(()=>expect(toggle).toBeEnabled()); fireEvent.click(toggle);
  await screen.findByRole('alert'); expect(toggle).not.toBeChecked();
 });
 it('cannot switch on without a loaded setting',async()=>{
  rpc.mockResolvedValue({error:{message:'Missing migration'}});
  render(<GuestbookAutoShare eventId="event-one" />);
  await screen.findByRole('alert'); expect(screen.getByRole('switch')).toBeDisabled();
 });
});
