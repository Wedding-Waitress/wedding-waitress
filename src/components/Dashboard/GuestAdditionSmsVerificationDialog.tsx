import { useEffect, useRef, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/enhanced-button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onVerified: () => Promise<boolean> | boolean
}

interface StatusResponse {
  ownerCanVerify?: boolean
  verified?: boolean
  savedMobile?: string | null
  maskedPhone?: string | null
  error?: string
}

const errorMessage = (data: unknown, fallback: string) =>
  (data as { error?: string } | null)?.error || fallback

const friendlyInvokeError = (message: string | undefined, fallback: string) =>
  /failed to send a request to the edge function/i.test(message || '')
    ? 'SMS verification is not active in this environment yet.'
    : message || fallback

export function GuestAdditionSmsVerificationDialog({ open, onOpenChange, eventId, onVerified }: Props) {
  const [step, setStep] = useState<'loading' | 'mobile' | 'code' | 'owner-required'>('loading')
  const [mobile, setMobile] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const onVerifiedRef = useRef(onVerified)

  useEffect(() => { onVerifiedRef.current = onVerified }, [onVerified])

  useEffect(() => {
    if (!open) return
    setStep('loading')
    setCode('')
    setError('')
    void supabase.functions.invoke('guest-addition-sms-enrolment', {
      body: { action: 'status', event_id: eventId },
    }).then(async ({ data, error: invokeError }) => {
      const status = data as StatusResponse | null
      if (invokeError || status?.error) {
        setError(errorMessage(status, friendlyInvokeError(invokeError?.message, 'Could not load mobile verification.')))
        setStep('mobile')
        return
      }
      if (status?.verified) {
        if (await onVerifiedRef.current()) onOpenChange(false)
        return
      }
      if (!status?.ownerCanVerify) {
        setStep('owner-required')
        return
      }
      setMobile(status.savedMobile || '')
      setStep('mobile')
    }).catch(() => {
      setError('Could not load mobile verification.')
      setStep('mobile')
    })
  }, [eventId, onOpenChange, open])

  const requestCode = async () => {
    if (!mobile.trim() || busy) return
    setBusy(true)
    setError('')
    const { data, error: invokeError } = await supabase.functions.invoke('guest-addition-sms-enrolment', {
      body: { action: 'request', event_id: eventId, mobile: mobile.trim() },
    })
    setBusy(false)
    if (invokeError || (data as { error?: string } | null)?.error) {
      setError(errorMessage(data, friendlyInvokeError(invokeError?.message, 'Could not send the verification code.')))
      return
    }
    setMaskedPhone((data as { maskedPhone?: string } | null)?.maskedPhone || 'your mobile')
    setStep('code')
  }

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code) || busy) return
    setBusy(true)
    setError('')
    const { data, error: invokeError } = await supabase.functions.invoke('guest-addition-sms-enrolment', {
      body: { action: 'verify', event_id: eventId, code },
    })
    setBusy(false)
    if (invokeError || (data as { error?: string } | null)?.error) {
      setError(errorMessage(data, friendlyInvokeError(invokeError?.message, 'Could not verify that code.')))
      return
    }
    if (await onVerifiedRef.current()) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#2f1b14]"><ShieldCheck size={19} aria-hidden="true" />Verify organiser mobile</DialogTitle>
          <DialogDescription>
            Confirm the event owner&apos;s mobile number once to receive optional SMS alerts.
          </DialogDescription>
        </DialogHeader>

        {step === 'loading' && <p className="flex items-center gap-2 text-sm" role="status"><Loader2 size={16} className="animate-spin" />Loading saved mobile…</p>}
        {step === 'owner-required' && (
          <p className="rounded-xl bg-[#fff8e8] p-3 text-sm text-[#2f1b14]" role="status">
            The event owner must sign in and verify their saved mobile before an editor can enable these SMS alerts.
          </p>
        )}
        {step === 'mobile' && (
          <div className="space-y-2">
            <Label htmlFor="guest-addition-alert-mobile">Event owner mobile</Label>
            <Input id="guest-addition-alert-mobile" type="tel" inputMode="tel" autoComplete="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="04XX XXX XXX or +61…" disabled={busy} />
            <p className="text-xs text-muted-foreground">We will send a six-digit code to confirm ownership. The code expires after 10 minutes.</p>
          </div>
        )}
        {step === 'code' && (
          <div className="space-y-2">
            <Label htmlFor="guest-addition-alert-code">Six-digit verification code</Label>
            <Input id="guest-addition-alert-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" disabled={busy} />
            <p className="text-xs text-muted-foreground">Enter the six-digit code for {maskedPhone}. Five incorrect attempts invalidate it.</p>
          </div>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          {step === 'mobile' && <Button onClick={() => void requestCode()} disabled={busy || !mobile.trim()} className="rounded-full bg-green-600 text-white hover:bg-green-700">{busy ? 'Sending…' : 'Send verification code'}</Button>}
          {step === 'code' && <Button onClick={() => void verifyCode()} disabled={busy || code.length !== 6} className="rounded-full bg-green-600 text-white hover:bg-green-700">{busy ? 'Verifying…' : 'Verify and enable SMS alerts'}</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="rounded-full">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
