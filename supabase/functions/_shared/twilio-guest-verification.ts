import { isVerificationCode, recordedMobileE164 } from './guest-verification-policy.ts';

export type GuestVerifyConfiguration = { accountSid: string; authToken: string; serviceSid: string };
export type GuestVerifyErrorCode = 'configuration' | 'invalid_target' | 'rate_limited' | 'rejected' | 'unavailable';

/** Never includes provider payloads, destinations, codes or credentials in the error message. */
export class GuestVerifyProviderError extends Error {
  constructor(public readonly code: GuestVerifyErrorCode, public readonly acceptanceUnknown = false) {
    super('Guest verification provider: ' + code);
    this.name = 'GuestVerifyProviderError';
  }
}

const isSid = (value: unknown, prefix: string): value is string => typeof value === 'string' && new RegExp('^' + prefix + '[a-fA-F0-9]{32}$').test(value);

/**
 * Server-only provider transport. Caller must atomically claim a challenge and reserve a shared
 * credit before start(), enforce the guest-app phase, and store the returned reference privately.
 * This layer never retries a send or marks a verification approved without checking the code.
 */
export function createGuestVerifyProvider(config: GuestVerifyConfiguration, fetcher: typeof fetch = fetch) {
  if (!isSid(config.accountSid, 'AC') || !isSid(config.serviceSid, 'VA') || typeof config.authToken !== 'string'
    || config.authToken.length < 16 || config.authToken.length > 256 || /[\r\n]/.test(config.authToken)) {
    throw new GuestVerifyProviderError('configuration');
  }
  const base = 'https://verify.twilio.com/v2/Services/' + config.serviceSid;
  const authorization = 'Basic ' + btoa(config.accountSid + ':' + config.authToken);

  async function request(suffix: string, method: 'GET' | 'POST', fields: URLSearchParams | undefined, sending: boolean) {
    let response: Response;
    try {
      response = await fetcher(base + suffix, {
        method, redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { Authorization: authorization, ...(fields ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
        ...(fields ? { body: fields.toString() } : {}),
      });
    } catch { throw new GuestVerifyProviderError('unavailable', sending); }
    if (!response.ok) {
      if (response.status === 429) throw new GuestVerifyProviderError('rate_limited');
      if (response.status === 401 || response.status === 403) throw new GuestVerifyProviderError('configuration');
      if (!sending && response.status === 404) return null;
      throw new GuestVerifyProviderError(response.status >= 500 ? 'unavailable' : 'rejected', sending && response.status >= 500);
    }
    try { return await response.json(); }
    catch { throw new GuestVerifyProviderError('unavailable', sending); }
  }

  function destination(recordedMobile: string): string {
    const phone = recordedMobileE164(recordedMobile);
    if (!phone) throw new GuestVerifyProviderError('invalid_target');
    return phone;
  }

  return {
    /** Read-only provider prerequisite check; sends no code. */
    async checkService(): Promise<{ available: true; codeLength: 6 }> {
      const data = await request('', 'GET', undefined, false);
      if (!data || data.sid !== config.serviceSid || data.code_length !== 6) throw new GuestVerifyProviderError('configuration');
      return { available: true, codeLength: 6 };
    },
    async start(recordedMobile: string): Promise<{ reference: string; state: 'pending' }> {
      const phone = destination(recordedMobile);
      const data = await request('/Verifications', 'POST', new URLSearchParams({ To: phone, Channel: 'sms' }), true);
      if (!data || !isSid(data.sid, 'VE') || data.service_sid !== config.serviceSid || data.status !== 'pending'
        || (data.to && data.to !== phone) || (data.channel && data.channel !== 'sms')) {
        throw new GuestVerifyProviderError('unavailable', true);
      }
      return { reference: data.sid, state: 'pending' };
    },
    async check(reference: string, code: string, recordedMobile: string): Promise<boolean> {
      const phone = destination(recordedMobile);
      if (!isSid(reference, 'VE') || !isVerificationCode(code)) return false;
      const data = await request('/VerificationCheck', 'POST', new URLSearchParams({ VerificationSid: reference, Code: code }), false);
      if (!data) return false;
      if (data.sid !== reference || data.service_sid !== config.serviceSid || (data.to && data.to !== phone)
        || (data.channel && data.channel !== 'sms')) throw new GuestVerifyProviderError('unavailable');
      return data.status === 'approved' && data.valid !== false;
    },
  };
}
