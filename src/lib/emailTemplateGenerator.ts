import { generateElegantTemplate, generateModernTemplate, generateRusticTemplate } from '@/../supabase/functions/send-initial-invitations/_templates';
import type { TemplateData, TemplateType } from '@/../supabase/functions/send-initial-invitations/_templates';

export interface TemplateCustomizations {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  headingFont?: string;
  bodyFont?: string;
  fontSize?: 'small' | 'medium' | 'large';
  customMessage?: string;
  ctaButtonText?: string;
}

export interface GenerateTemplateConfig {
  baseTemplate: TemplateType;
  customizations?: TemplateCustomizations;
  eventData: Partial<TemplateData>;
}

/**
 * Generate custom email template with user customizations
 */
export const generateCustomEmailTemplate = (config: GenerateTemplateConfig): string => {
  const { baseTemplate, customizations = {}, eventData } = config;
  
  // Use placeholder data for preview
  const templateData: TemplateData = {
    eventName: eventData.eventName || '{{EVENT_NAME}}',
    eventDate: eventData.eventDate || '{{EVENT_DATE}}',
    eventVenue: eventData.eventVenue || '{{EVENT_VENUE}}',
    guestFirstName: eventData.guestFirstName || '{{GUEST_FIRST_NAME}}',
    guestLastName: eventData.guestLastName || '{{GUEST_LAST_NAME}}',
    qrCodeDataUrl: eventData.qrCodeDataUrl || 'data:image/png;base64,placeholder',
    eventUrl: eventData.eventUrl || '{{EVENT_URL}}',
    partner1Name: eventData.partner1Name,
    partner2Name: eventData.partner2Name,
    customMessage: customizations.customMessage || eventData.customMessage,
  };

  // Generate base template HTML
  let html: string;
  switch (baseTemplate) {
    case 'elegant':
      html = generateElegantTemplate(templateData);
      break;
    case 'rustic':
      html = generateRusticTemplate(templateData);
      break;
    case 'modern':
    default:
      html = generateModernTemplate(templateData);
  }

  // Apply CSS customizations if provided
  if (customizations.primaryColor) {
    html = html.replace(/primaryColor:\s*#[0-9A-Fa-f]{6}/g, `primaryColor: ${customizations.primaryColor}`);
  }
  
  if (customizations.backgroundColor) {
    html = html.replace(/backgroundColor:\s*#[0-9A-Fa-f]{6}/g, `backgroundColor: ${customizations.backgroundColor}`);
  }

  if (customizations.headingFont) {
    html = html.replace(/font-family:\s*[^;]+;/g, `font-family: ${customizations.headingFont}, sans-serif;`);
  }

  return html;
};

/**
 * Replace placeholders in template with actual data at send time
 */
export const replacePlaceholders = (html: string, data: Record<string, string>): string => {
  let result = html;
  
  const placeholderMap: Record<string, string> = {
    '{{GUEST_FIRST_NAME}}': data.guestFirstName || '',
    '{{GUEST_LAST_NAME}}': data.guestLastName || '',
    '{{FULL_NAME}}': `${data.guestFirstName || ''} ${data.guestLastName || ''}`.trim(),
    '{{QR_CODE}}': data.qrCodeDataUrl || '',
    '{{EVENT_URL}}': data.eventUrl || '',
    '{{EVENT_NAME}}': data.eventName || '',
    '{{EVENT_DATE}}': data.eventDate || '',
    '{{EVENT_VENUE}}': data.eventVenue || '',
    '{{PARTNER1_NAME}}': data.partner1Name || '',
    '{{PARTNER2_NAME}}': data.partner2Name || '',
    '{{CUSTOM_MESSAGE}}': data.customMessage || '',
  };

  Object.entries(placeholderMap).forEach(([placeholder, value]) => {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });

  return result;
};

/**
 * Get list of available system templates
 */
export const getSystemTemplates = () => [
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Classic sophistication with champagne gold accents',
    type: 'system' as const,
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Bold gradients with contemporary design',
    type: 'system' as const,
  },
  {
    id: 'rustic',
    name: 'Rustic',
    description: 'Natural warmth with handcrafted charm',
    type: 'system' as const,
  },
];
