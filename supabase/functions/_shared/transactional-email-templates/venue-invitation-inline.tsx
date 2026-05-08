/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  coupleNames?: string
  venueName?: string
  contactName?: string
  eventId?: string
}

const VenueInvitationEmail = ({ coupleNames, venueName, contactName, eventId }: Props) => {
  const greeting = contactName?.trim() ? `Hi ${contactName.trim()},` : 'Hello,'
  const couple = coupleNames?.trim() || 'A couple'
  const venuePart = venueName?.trim() ? ` at ${venueName.trim()}` : ''
  const ctaHref = `https://weddingwaitress.com.au/?ref=venue-${eventId ?? ''}`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>An invitation to explore Wedding Waitress</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>An invitation to explore Wedding Waitress</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            {couple} is currently using Wedding Waitress to plan their wedding{venuePart}, and thought your venue may also benefit from the platform.
          </Text>
          <Text style={text}>Wedding Waitress helps venues and couples coordinate seamlessly, with tools for:</Text>
          <ul style={list}>
            <li style={li}>Guest management</li>
            <li style={li}>RSVP coordination</li>
            <li style={li}>Planning workflows</li>
            <li style={li}>Seating management</li>
            <li style={li}>Operational efficiency</li>
          </ul>
          <Section style={{ margin: '28px 0' }}>
            <Button href={ctaHref} style={button}>Explore Wedding Waitress</Button>
          </Section>
          <Text style={italic}>Built for couples, planners, and venues coordinating events together.</Text>
          <Text style={signoff}>— The Wedding Waitress Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: VenueInvitationEmail,
  subject: 'An invitation to explore Wedding Waitress',
  displayName: 'Venue invitation (referral)',
  previewData: { coupleNames: 'Jane & John', venueName: 'The Grand Estate', contactName: 'Sarah', eventId: 'preview' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 600, color: '#3D2E1E', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3D2E1E', lineHeight: '1.6', margin: '0 0 16px' }
const list = { paddingLeft: '20px', margin: '0 0 20px', color: '#3D2E1E' }
const li = { fontSize: '15px', lineHeight: '1.8' }
const button = {
  backgroundColor: '#967A59', color: '#ffffff', padding: '12px 24px',
  borderRadius: '999px', textDecoration: 'none', fontWeight: 600,
  fontSize: '15px', display: 'inline-block',
}
const italic = { fontSize: '13px', color: '#6E6E73', margin: '24px 0 0', fontStyle: 'italic' as const }
const signoff = { fontSize: '13px', color: '#6E6E73', margin: '8px 0 0' }
