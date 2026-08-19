/**
 * Confirmation email sent to the event owner after a successful RSVP
 * tier or RSVP overage purchase. Triggered from the verify-payment
 * Edge Function once the purchase row is recorded.
 */
/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface RsvpInvitationsSentProps {
  firstName?: string
  guestCount?: number
  tierLabel?: string
  amount?: string | number
  isOverage?: boolean
}

const RsvpInvitationsSentEmail = ({
  firstName,
  guestCount,
  tierLabel,
  amount,
  isOverage,
}: RsvpInvitationsSentProps) => {
  const summaryLine = isOverage
    ? `Additional RSVP Allowance${guestCount ? ` (+${guestCount} guests)` : ''}`
    : tierLabel
      ? `${tierLabel} RSVP Bundle`
      : 'RSVP Invite Bundle'
  const amountDisplay = amount != null ? `$${amount} AUD` : null

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your RSVP invitations have been sent 🎉</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your RSVP invitations have been sent 🎉</Heading>
          <Text style={text}>Hi {firstName || 'there'},</Text>
          <Text style={text}>
            Your RSVP invitations have been successfully sent to your selected guests.
          </Text>
          <Text style={text}>
            You should start receiving replies soon. Please check your dashboard
            regularly for updates.
          </Text>

          <Section style={summaryBox}>
            {guestCount ? (
              <Text style={summaryHeading}>
                {guestCount} {guestCount === 1 ? 'guest' : 'guests'} invited
              </Text>
            ) : null}
            <Text style={summaryLineStyle}>{summaryLine}</Text>
            {amountDisplay ? <Text style={summaryAmount}>{amountDisplay}</Text> : null}
          </Section>

          <Section style={buttonSection}>
            <Button
              href="https://weddingwaitress.com.au/dashboard?tab=guest-list"
              style={button}
            >
              View your dashboard
            </Button>
          </Section>

          <Heading style={h2}>Need to add more guests?</Heading>
          <Text style={text}>
            You can add additional guests anytime for just <strong>$10 per 10 guests</strong>.
          </Text>

          <Text style={signoff}>– The Wedding Waitress Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RsvpInvitationsSentEmail,
  subject: 'Your RSVP invitations have been sent 🎉',
  displayName: 'RSVP invitations sent',
  previewData: {
    firstName: 'Jane',
    guestCount: 78,
    tierLabel: '1–100 Guests',
    amount: '100.00',
    isOverage: false,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#3D2E1E', margin: '0 0 24px' }
const h2 = { fontSize: '18px', fontWeight: 'bold', color: '#3D2E1E', margin: '28px 0 12px' }
const text = { fontSize: '15px', color: '#3D2E1E', lineHeight: '1.6', margin: '0 0 16px' }
const summaryBox = {
  backgroundColor: '#F8F4EE',
  border: '1px solid #E8E1D6',
  borderRadius: '10px',
  padding: '16px 20px',
  margin: '20px 0 8px',
}
const summaryHeading = { fontSize: '16px', fontWeight: 700, color: '#3D2E1E', margin: '0 0 4px' }
const summaryLineStyle = { fontSize: '14px', color: '#5C4A36', margin: '0 0 4px' }
const summaryAmount = { fontSize: '18px', fontWeight: 700, color: '#967A59', margin: '0' }
const buttonSection = { margin: '24px 0 8px' }
const button = {
  backgroundColor: '#967A59',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '15px',
  display: 'inline-block',
}
const signoff = { fontSize: '15px', color: '#3D2E1E', margin: '24px 0 0', fontWeight: 600 }
