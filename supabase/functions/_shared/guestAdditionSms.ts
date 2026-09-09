export interface GuestAdditionSmsInput {
  eventName: string
  addedByName: string
  addedGuestName: string
}

const gsmSafe = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[^A-Za-z0-9 .,'&-]/g, '?')
  .replace(/\s+/g, ' ')
  .trim()

export const buildGuestAdditionSms = (input: GuestAdditionSmsInput) => {
  const message = `Wedding Waitress: ${gsmSafe(input.addedByName)} added ${gsmSafe(input.addedGuestName)} to ${gsmSafe(input.eventName)}. Review in Guest List.`
  return message.length <= 160 ? message : `${message.slice(0, 157).trimEnd()}...`
}
