export interface TemplateData {
  eventName: string;
  eventDate: string;
  eventVenue: string;
  guestFirstName: string;
  guestLastName: string;
  qrCodeDataUrl: string;
  eventUrl: string;
  partner1Name?: string;
  partner2Name?: string;
  customMessage?: string;
  customSubject?: string;
}

export type TemplateType = 'elegant' | 'modern' | 'rustic';
