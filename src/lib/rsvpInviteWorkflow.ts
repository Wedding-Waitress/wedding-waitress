export type RsvpDeliveryMethod = 'email' | 'sms' | 'both';

export interface RsvpContactGuest {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  mobile?: string | null;
}

const hasValue = (value?: string | null) => Boolean(value?.trim());

export const guestLabel = (count: number) => `${count} ${count === 1 ? 'guest' : 'guests'}`;

export const deliveryMethodLabel = (method: RsvpDeliveryMethod) => {
  if (method === 'email') return 'Email only';
  if (method === 'sms') return 'SMS only';
  return 'Email + SMS';
};

export const sendButtonLabel = (method: RsvpDeliveryMethod, count: number) => {
  const channel = method === 'email' ? 'Email' : method === 'sms' ? 'SMS' : 'Email & SMS';
  return `Send ${channel} to ${count} ${count === 1 ? 'Guest' : 'Guests'}`;
};

export const getRsvpDeliverySummary = (
  guests: RsvpContactGuest[],
  method: RsvpDeliveryMethod | null = null,
) => {
  const withEmail = guests.filter((guest) => hasValue(guest.email));
  const withSms = guests.filter((guest) => hasValue(guest.mobile));
  const withBoth = guests.filter((guest) => hasValue(guest.email) && hasValue(guest.mobile));
  const missingEmail = guests.filter((guest) => !hasValue(guest.email));
  const missingMobile = guests.filter((guest) => !hasValue(guest.mobile));
  const missingEither = guests.filter((guest) => !hasValue(guest.email) || !hasValue(guest.mobile));

  const emailRecipients = method === 'email' || method === 'both' ? withEmail : [];
  const smsRecipients = method === 'sms' || method === 'both' ? withSms : [];

  return {
    selectedCount: guests.length,
    withEmail,
    withSms,
    withBoth,
    missingEmail,
    missingMobile,
    missingEither,
    emailRecipients,
    smsRecipients,
    emailRecipientCount: emailRecipients.length,
    smsRecipientCount: smsRecipients.length,
    creditsUsed: emailRecipients.length + smsRecipients.length,
    availability: {
      email: guests.length > 0 && missingEmail.length === 0,
      sms: guests.length > 0 && missingMobile.length === 0,
      both: guests.length > 0 && missingEmail.length === 0 && missingMobile.length === 0,
    },
  };
};

export const deliveryUnavailableReason = (
  method: RsvpDeliveryMethod,
  guests: RsvpContactGuest[],
) => {
  const summary = getRsvpDeliverySummary(guests);
  if (method === 'email' && summary.missingEmail.length > 0) {
    return `${guestLabel(summary.missingEmail.length)} ${summary.missingEmail.length === 1 ? 'has' : 'have'} no email address.`;
  }
  if (method === 'sms' && summary.missingMobile.length > 0) {
    return `${guestLabel(summary.missingMobile.length)} ${summary.missingMobile.length === 1 ? 'has' : 'have'} no mobile number.`;
  }
  if (method === 'both' && summary.missingEither.length > 0) {
    return `${guestLabel(summary.missingEither.length)} ${summary.missingEither.length === 1 ? 'is' : 'are'} missing an email address or mobile number.`;
  }
  return null;
};
