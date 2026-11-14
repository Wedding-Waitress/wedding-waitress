import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRsvpInvites } from './useRsvpInvites';

const mocks = vi.hoisted(() => ({ toast: vi.fn(), fetch: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://example.test',
  supabase: {
    from: mocks.from,
    auth: { getSession: async () => ({ data: { session: { access_token: 'test-only' } } }) },
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

describe('RSVP invitation requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    vi.stubGlobal('crypto', { randomUUID: () => '123e4567-e89b-42d3-a456-426614174000' });
  });

  it('sends the event, selected guests and an idempotency request ID to SMS without mutating guest data first', async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ sent: 1, failed: 0, skipped: 0 }), { status: 200 }));
    const { result } = renderHook(() => useRsvpInvites());
    await act(async () => { await result.current.sendSmsInvites('event-1', ['guest-1']); });

    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledWith('https://example.test/functions/v1/send-rsvp-sms', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ event_id: 'event-1', guest_ids: ['guest-1'], request_id: '123e4567-e89b-42d3-a456-426614174000' }),
    }));
  });

  it('shows the precise service response and reports a failed SMS as unsuccessful', async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
      error: 'SMS sending is not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to the Edge Function secrets.',
      code: 'SMS_NOT_CONFIGURED',
    }), { status: 503 }));
    const { result } = renderHook(() => useRsvpInvites());
    let sendResult: unknown;
    await act(async () => { sendResult = await result.current.sendSmsInvites('event-1', ['guest-1']); });

    expect(sendResult).toBeNull();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Invitation not sent', description: expect.stringContaining('TWILIO_ACCOUNT_SID'), variant: 'destructive',
    }));
  });

  it('uses the email endpoint for an email-only send', async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ sent: 1, failed: 0, skipped: 0 }), { status: 200 }));
    const { result } = renderHook(() => useRsvpInvites());
    let sendResult: Awaited<ReturnType<typeof result.current.sendRsvpInvites>>;
    await act(async () => { sendResult = await result.current.sendRsvpInvites('email', 'event-1', ['guest-1']); });

    expect(sendResult!.complete).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(mocks.fetch.mock.calls[0][0]).toBe('https://example.test/functions/v1/send-rsvp-email');
  });

  it('attempts both channels independently and reports an exact partial result', async () => {
    mocks.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith('send-rsvp-email')) {
        return new Response(JSON.stringify({ sent: 1, failed: 0, skipped: 0 }), { status: 200 });
      }
      return new Response(JSON.stringify({
        error: 'The SMS provider rejected the destination number.',
        code: 'SMS_SEND_FAILED', sent: 0, failed: 1, skipped: 0,
      }), { status: 502 });
    });
    const { result } = renderHook(() => useRsvpInvites());
    let sendResult: Awaited<ReturnType<typeof result.current.sendRsvpInvites>>;
    await act(async () => { sendResult = await result.current.sendRsvpInvites('both', 'event-1', ['guest-1']); });

    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(sendResult!).toMatchObject({ complete: false, partial: true, accepted: 1 });
    expect(sendResult!.channels).toEqual([
      expect.objectContaining({ channel: 'email', ok: true, sent: 1 }),
      expect.objectContaining({ channel: 'sms', ok: false, sent: 0, failed: 1 }),
    ]);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Invitation partially sent',
      description: expect.stringMatching(/Email: 1 accepted by the provider[\s\S]*SMS: 0 sent, 1 failed[\s\S]*destination number/),
      variant: 'destructive',
    }));
  });

  it('reports SMS success and email failure separately without claiming complete success', async () => {
    mocks.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith('send-rsvp-email')) {
        return new Response(JSON.stringify({
          error: 'The email provider rejected the message.',
          code: 'EMAIL_SEND_FAILED', sent: 0, failed: 1, skipped: 0,
        }), { status: 502 });
      }
      return new Response(JSON.stringify({ sent: 1, failed: 0, skipped: 0 }), { status: 200 });
    });
    const { result } = renderHook(() => useRsvpInvites());
    let sendResult: Awaited<ReturnType<typeof result.current.sendRsvpInvites>>;
    await act(async () => { sendResult = await result.current.sendRsvpInvites('both', 'event-1', ['guest-1']); });

    expect(sendResult!).toMatchObject({ complete: false, partial: true, accepted: 1 });
    expect(sendResult!.channels).toEqual([
      expect.objectContaining({ channel: 'email', ok: false, sent: 0, failed: 1 }),
      expect.objectContaining({ channel: 'sms', ok: true, sent: 1 }),
    ]);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Invitation partially sent',
      description: expect.stringMatching(/Email: 0 sent, 1 failed[\s\S]*SMS: 1 accepted by the provider/),
      variant: 'destructive',
    }));
  });

  it('does not report a failed provider response as accepted', async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
      error: 'Email provider test rejection.', code: 'EMAIL_SEND_FAILED', sent: 0, failed: 1, skipped: 0,
    }), { status: 502 }));
    const { result } = renderHook(() => useRsvpInvites());
    let sendResult: Awaited<ReturnType<typeof result.current.sendRsvpInvites>>;
    await act(async () => { sendResult = await result.current.sendRsvpInvites('email', 'event-1', ['guest-1']); });

    expect(sendResult!).toMatchObject({ complete: false, partial: false, accepted: 0 });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('handles a non-JSON Edge response without hiding the HTTP status', async () => {
    mocks.fetch.mockResolvedValue(new Response('gateway failure', { status: 502 }));
    const { result } = renderHook(() => useRsvpInvites());
    await act(async () => { await result.current.sendEmailInvites('event-1', ['guest-1']); });
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringContaining('Invitation service returned an invalid response (502).'),
    }));
  });
});
