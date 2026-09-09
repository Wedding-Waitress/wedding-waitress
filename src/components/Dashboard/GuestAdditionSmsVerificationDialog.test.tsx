import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuestAdditionSmsVerificationDialog } from './GuestAdditionSmsVerificationDialog'

const invoke = vi.fn()
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}))

describe('GuestAdditionSmsVerificationDialog', () => {
  beforeEach(() => invoke.mockReset())

  it('uses the saved signup mobile, verifies once, and enables the selected event', async () => {
    invoke
      .mockResolvedValueOnce({ data: { ownerCanVerify: true, verified: false, savedMobile: '0412 345 678' }, error: null })
      .mockResolvedValueOnce({ data: { providerAccepted: true, maskedPhone: '+61••••678' }, error: null })
      .mockResolvedValueOnce({ data: { verified: true, smsEnabled: true }, error: null })
    const onVerified = vi.fn().mockResolvedValue(true)

    render(<GuestAdditionSmsVerificationDialog open onOpenChange={vi.fn()} eventId="event-1" onVerified={onVerified} />)
    const mobile = await screen.findByLabelText('Event owner mobile')
    expect(mobile).toHaveValue('0412 345 678')
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }))
    await waitFor(() => expect(invoke).toHaveBeenNthCalledWith(2, 'guest-addition-sms-enrolment', {
      body: { action: 'request', event_id: 'event-1', mobile: '0412 345 678' },
    }))

    const code = await screen.findByLabelText('Six-digit verification code')
    fireEvent.change(code, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify and enable SMS alerts' }))
    await waitFor(() => expect(invoke).toHaveBeenNthCalledWith(3, 'guest-addition-sms-enrolment', {
      body: { action: 'verify', event_id: 'event-1', code: '123456' },
    }))
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1))
  })

  it('does not let a shared editor verify or replace the owner mobile', async () => {
    invoke.mockResolvedValueOnce({ data: { ownerCanVerify: false, verified: false, savedMobile: null }, error: null })
    render(<GuestAdditionSmsVerificationDialog open onOpenChange={vi.fn()} eventId="shared-event" onVerified={vi.fn()} />)

    expect(await screen.findByText(/event owner must sign in and verify/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Event owner mobile')).not.toBeInTheDocument()
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('clearly reports that the local UI is waiting for the enrolment function rollout', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'Failed to send a request to the Edge Function' } })
    render(<GuestAdditionSmsVerificationDialog open onOpenChange={vi.fn()} eventId="event-1" onVerified={vi.fn().mockResolvedValue(false)} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('SMS verification is not active in this environment yet.')
    expect(screen.queryByText(/Twilio account/i)).not.toBeInTheDocument()
  })

  it('enables the selected event before closing when the owner phone is already verified', async () => {
    invoke.mockResolvedValueOnce({ data: { ownerCanVerify: true, verified: true, maskedPhone: '+61••••678' }, error: null })
    const onVerified = vi.fn().mockResolvedValue(true)
    const onOpenChange = vi.fn()
    render(<GuestAdditionSmsVerificationDialog open onOpenChange={onOpenChange} eventId="event-1" onVerified={onVerified} />)

    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
