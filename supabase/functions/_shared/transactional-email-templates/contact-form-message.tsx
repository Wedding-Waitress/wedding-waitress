/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Contact form notification template (locked 2026-04-18).
 * Any change requires explicit owner approval.
 */
/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ContactFormMessageProps {
  name?: string
  email?: string
  message?: string
  date?: string
}

const formatDate = (iso?: string) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

const ContactFormMessageEmail = ({ name, email, message, date }: ContactFormMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New contact message from {name || 'a visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New contact form message</Heading>
        <Text style={intro}>You have received a new message via the Wedding Waitress contact form.</Text>

        <Section style={card}>
          <Text style={label}>Name</Text>
          <Text style={value}>{name || '—'}</Text>

          <Text style={label}>Email</Text>
          <Text style={value}>
            {email ? <Link href={`mailto:${email}`} style={linkStyle}>{email}</Link> : '—'}
          </Text>

          <Text style={label}>Submitted</Text>
          <Text style={value}>{formatDate(date)}</Text>

          <Text style={label}>Message</Text>
          <Text style={{ ...value, whiteSpace: 'pre-wrap' }}>{message || '—'}</Text>
        </Section>

        <Text style={footer}>Wedding Waitress · Contact form notification</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactFormMessageEmail,
  subject: (data: Record<string, any>) => `New contact message from ${data?.name || 'visitor'}`,
  to: 'support@weddingwaitress.com',
  displayName: 'Contact form message',
  previewData: {
    name: 'Jane Smith',
    email: 'jane@example.com',
    message: 'Hi, I have a question about your premium plan.\n\nThanks!',
    date: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#1D1D1F' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#1D1D1F', margin: '0 0 12px', borderBottom: '2px solid #967A59', paddingBottom: '12px' }
const intro = { fontSize: '14px', color: '#6E6E73', margin: '0 0 24px', lineHeight: '1.5' }
const card = { backgroundColor: '#FAFAFA', border: '1px solid #E5E5E7', borderRadius: '12px', padding: '20px 24px', margin: '0 0 24px' }
const label = { fontSize: '11px', fontWeight: 'bold', color: '#967A59', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '16px 0 4px' }
const value = { fontSize: '15px', color: '#1D1D1F', margin: '0', lineHeight: '1.5' }
const linkStyle = { color: '#967A59', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0', textAlign: 'center' as const }
