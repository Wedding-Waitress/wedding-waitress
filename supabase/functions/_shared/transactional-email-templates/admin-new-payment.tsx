/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY without explicit owner approval.
 * Admin notification: a new payment was received.
 */
/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AdminPaymentProps {
  name?: string
  email?: string
  amount?: string | number
  plan?: string
  date?: string
}

const AdminNewPaymentEmail = ({ name, email, amount, plan, date }: AdminPaymentProps) => {
  const formattedDate = date ? new Date(date).toLocaleString('en-AU', {
    dateStyle: 'medium', timeStyle: 'short',
  }) : new Date().toLocaleString('en-AU')
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New payment received on Wedding Waitress</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Payment Received 💰</Heading>
          <Text style={text}>A payment has been made:</Text>
          <Text style={row}><strong>User:</strong> {name || '—'}</Text>
          <Text style={row}><strong>Email:</strong> {email || '—'}</Text>
          <Text style={row}><strong>Amount:</strong> ${amount ?? '—'}</Text>
          <Text style={row}><strong>Plan:</strong> {plan || '—'}</Text>
          <Text style={row}><strong>Date:</strong> {formattedDate}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminNewPaymentEmail,
  subject: 'New Payment Received 💰',
  to: 'support@weddingwaitress.com.au',
  displayName: 'Admin: new payment',
  previewData: {
    name: 'Jane Smith', email: 'jane@example.com', amount: '149', plan: 'Premium',
    date: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#3D2E1E', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3D2E1E', lineHeight: '1.6', margin: '0 0 16px' }
const row = { fontSize: '15px', color: '#3D2E1E', lineHeight: '1.6', margin: '0 0 8px' }
