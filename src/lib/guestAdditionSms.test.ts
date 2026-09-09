import { describe, expect, it } from 'vitest'
import { buildGuestAdditionSms } from '../../supabase/functions/_shared/guestAdditionSms'

describe('guest addition organiser SMS', () => {
  it('produces one concise GSM-safe segment for representative names', () => {
    const message = buildGuestAdditionSms({
      eventName: 'Renée & D’Arcy Wedding',
      addedByName: 'José O’Connor',
      addedGuestName: 'Zoë Smith',
    })

    expect(message).toBe("Wedding Waitress: Jose O'Connor added Zoe Smith to Renee & D'Arcy Wedding. Review in Guest List.")
    expect(message.length).toBeLessThanOrEqual(160)
    expect(message).toMatch(/^[A-Za-z0-9 :.,'&-]+$/)
  })

  it('caps long content at one 160-character GSM-7 segment', () => {
    const message = buildGuestAdditionSms({
      eventName: 'A'.repeat(120),
      addedByName: 'B'.repeat(120),
      addedGuestName: 'C'.repeat(120),
    })
    expect(message).toHaveLength(160)
    expect(message.endsWith('...')).toBe(true)
  })
})
