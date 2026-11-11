/** Provider-independent policy. All identity/phone/session inputs must come from server-owned records. */
export const GUEST_VERIFICATION_LIMITS = Object.freeze({
  codeLifetimeMs: 5 * 60_000,
  sessionLifetimeMs: 2 * 60 * 60_000,
  resendWaitMs: 60_000,
  attemptsPerChallenge: 5,
  requestsPerGuestHour: 5,
  requestsPerIpHour: 30,
  requestsPerEventHour: 300,
});

export type GuestAppPhase = 'invitation' | 'seating';

function dateNumber(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Invalid event date');
  const result = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(result) || new Date(result).toISOString().slice(0, 10) !== value) throw new RangeError('Invalid event date');
  return result;
}

/** Inclusive event-local calendar boundary; no device-zone, role, or RSVP-deadline override. */
export function guestAppPhase(eventDate: string, eventTimezone: string, now = new Date()): GuestAppPhase {
  if (!eventTimezone || !Number.isFinite(now.valueOf())) throw new RangeError('Event clock unavailable');
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: eventTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (key: string) => parts.find(p => p.type === key)!.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  return (dateNumber(eventDate) - dateNumber(today)) / 86_400_000 <= 7 ? 'seating' : 'invitation';
}

/** Normalises a recorded destination, never a guest-supplied replacement phone. */
export function recordedMobileE164(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 80) return null;
  let phone = value.replace(/[\s().-]/g, '');
  if (/^04\d{8}$/.test(phone)) phone = '+61' + phone.slice(1);
  else if (/^614\d{8}$/.test(phone)) phone = '+' + phone;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export function isVerificationCode(value: unknown): value is string {
  return typeof value === 'string' && /^\d{6}$/.test(value);
}

export type RecordedGuest = { id: string; eventId: string; familyGroup: string | null };
export type VerifiedGuestSession = {
  guestId: string;
  eventId: string;
  familyGroup: string | null;
  phoneFingerprint: string;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
};

function family(value: string | null): string | null {
  return value && value.trim() ? value : null;
}

/** Must be rechecked on every private read/write, including after a previously verified visit. */
export function guestSessionAllows(input: {
  session: VerifiedGuestSession;
  anchor: RecordedGuest;
  target: RecordedGuest;
  currentRecordedPhoneFingerprint: string;
  eventDate: string;
  eventTimezone: string;
  now: Date;
}): boolean {
  const { session, anchor, target, currentRecordedPhoneFingerprint, now } = input;
  try {
    if (guestAppPhase(input.eventDate, input.eventTimezone, now) !== 'invitation') return false;
  } catch { return false; }
  const time = now.valueOf();
  if (session.revokedAt !== null || !Number.isFinite(session.createdAt) || !Number.isFinite(session.expiresAt)) return false;
  if (session.createdAt > time || session.expiresAt <= time || session.expiresAt <= session.createdAt) return false;
  if (session.expiresAt - session.createdAt > GUEST_VERIFICATION_LIMITS.sessionLifetimeMs) return false;
  if (!/^[a-f0-9]{64}$/.test(currentRecordedPhoneFingerprint) || session.phoneFingerprint !== currentRecordedPhoneFingerprint) return false;
  if (session.guestId !== anchor.id || session.eventId !== anchor.eventId || target.eventId !== anchor.eventId) return false;
  if (family(session.familyGroup) !== family(anchor.familyGroup)) return false;
  return target.id === anchor.id || (family(anchor.familyGroup) !== null && target.familyGroup === anchor.familyGroup);
}

export type CodeRequestState = {
  phase: GuestAppPhase;
  recordedMobile: unknown;
  now: number;
  lastRequestAt: number | null;
  guestRequestsInHour: number;
  ipRequestsInHour: number;
  eventRequestsInHour: number;
};

/** Internal decision only; external request responses must not disclose lookup/phone existence. */
export function canRequestGuestCode(state: CodeRequestState): boolean {
  if (state.phase !== 'invitation' || !recordedMobileE164(state.recordedMobile) || !Number.isFinite(state.now)) return false;
  if (state.lastRequestAt !== null && state.now - state.lastRequestAt < GUEST_VERIFICATION_LIMITS.resendWaitMs) return false;
  return state.guestRequestsInHour >= 0 && state.guestRequestsInHour < GUEST_VERIFICATION_LIMITS.requestsPerGuestHour
    && state.ipRequestsInHour >= 0 && state.ipRequestsInHour < GUEST_VERIFICATION_LIMITS.requestsPerIpHour
    && state.eventRequestsInHour >= 0 && state.eventRequestsInHour < GUEST_VERIFICATION_LIMITS.requestsPerEventHour;
}

export function challengeCanBeChecked(createdAt: number, expiresAt: number, attempts: number, consumed: boolean, now: number): boolean {
  return !consumed && Number.isFinite(createdAt) && Number.isFinite(expiresAt) && Number.isFinite(now)
    && createdAt <= now && expiresAt > now && expiresAt > createdAt
    && expiresAt - createdAt <= GUEST_VERIFICATION_LIMITS.codeLifetimeMs
    && Number.isInteger(attempts) && attempts >= 0 && attempts < GUEST_VERIFICATION_LIMITS.attemptsPerChallenge;
}
