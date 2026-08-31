/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as adminNewSignup } from './admin-new-signup.tsx'
import { template as adminNewPayment } from './admin-new-payment.tsx'
import { template as contactFormMessage } from './contact-form-message.tsx'
import { template as rsvpInvitationsSent } from './rsvp-invitations-sent.tsx'
import { template as venueInvitationInline } from './venue-invitation-inline.tsx'
import { template as accountTeamInvitation } from './account-team-invitation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'admin-new-signup': adminNewSignup,
  'admin-new-payment': adminNewPayment,
  'contact-form-message': contactFormMessage,
  'rsvp-invitations-sent': rsvpInvitationsSent,
  'venue-invitation-inline': venueInvitationInline,
  'account-team-invitation': accountTeamInvitation,
}
