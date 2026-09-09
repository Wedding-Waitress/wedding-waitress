import { describe, expect, it } from 'vitest'
import { buildGuestAdditionEmail, guestAdditionEmailIdempotencyKey } from '../../supabase/functions/_shared/guestAdditionEmail'

describe('guest addition organiser email', () => {
  it('builds separate/group wording and a direct review link', () => {
    const separate = buildGuestAdditionEmail({
      eventName: 'Alex & Sam',
      addedByName: 'Renée O’Connor',
      addedGuestName: 'D’Arcy Smith',
      groupChoice: 'separate',
      guestId: 'guest-id',
    })
    const group = buildGuestAdditionEmail({
      eventName: 'Alex & Sam',
      addedByName: 'Renée',
      addedGuestName: 'D’Arcy',
      groupChoice: 'group',
      guestId: 'guest-id',
    })

    expect(separate.subject).toBe('Renée O’Connor added D’Arcy Smith to Alex & Sam')
    expect(separate.html).toContain('as a separate guest')
    expect(group.html).toContain('as part of their group')
    expect(separate.html).toContain('dashboard?tab=guest-list&amp;guest=guest-id')
    expect(separate.html).toContain('wedding-waitress-logo-brown.png')
    expect(separate.html).toContain('alt="Wedding Waitress"')
    expect(separate.html).toContain('There is a new guest to review in your Wedding Waitress Guest List.')
    expect(separate.html).toContain('background-color:#967a59')
  })

  it('escapes user-controlled HTML while preserving readable subject text', () => {
    const email = buildGuestAdditionEmail({
      eventName: '<Wedding & Reception>',
      addedByName: 'A <script>',
      addedGuestName: 'B & C',
      groupChoice: 'group',
      guestId: 'id&next=bad',
    })

    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;Wedding &amp; Reception&gt;')
    expect(email.html).toContain('id%26next%3Dbad')
    expect(email.subject).toBe('A <script> added B & C to <Wedding & Reception>')
  })

  it('uses one stable provider idempotency key per notification', () => {
    expect(guestAdditionEmailIdempotencyKey('abc-123')).toBe('guest-addition/abc-123')
    expect(guestAdditionEmailIdempotencyKey('abc-123')).toBe(guestAdditionEmailIdempotencyKey('abc-123'))
    expect(guestAdditionEmailIdempotencyKey('other')).not.toBe(guestAdditionEmailIdempotencyKey('abc-123'))
  })
})
