import { getCountries, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

const countries = new Set<string>(getCountries());

export function detectGuestPhoneCountry(
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): CountryCode | undefined {
  if (timeZone.startsWith('Australia/') || timeZone === 'Antarctica/Macquarie') return 'AU';
  for (const language of languages) {
    try {
      const region = new Intl.Locale(language).region;
      if (region && countries.has(region)) return region as CountryCode;
    } catch { /* Ignore malformed browser locale hints. */ }
  }
  return undefined;
}

export function normalizeGuestPhone(value: string | null | undefined, country = detectGuestPhoneCountry()): string {
  const raw = value?.trim() || '';
  if (!raw) return '';
  if (!/^[+\d\s().-]+$/.test(raw)) throw new Error('Enter a valid mobile number.');
  const phone = parsePhoneNumberFromString(raw, { defaultCountry: country, extract: false });
  if (!phone?.isPossible()) {
    throw new Error(country ? 'Enter a complete mobile number, including its area or country code.' : 'Include the international country code, for example +61 for Australia.');
  }
  return phone.number;
}

export function guestPhoneHint() {
  const country = detectGuestPhoneCountry();
  if (country === 'AU') return 'Australia detected (+61). Enter 04… or an international number with +.';
  if (country) return `${new Intl.DisplayNames(['en'], { type: 'region' }).of(country)} detected. International numbers can start with +.`;
  return 'Include the international country code, for example +61 for Australia.';
}
