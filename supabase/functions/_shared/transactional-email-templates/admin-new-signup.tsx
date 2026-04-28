/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY without explicit owner approval.
 * Admin notification: a new user signed up.
 */
/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AdminSignupProps {
  fullName?: string
  email?: string
  date?: string
}

const AdminNewSignupEmail = ({ fullName, email, date }: AdminSignupProps) => {
  const formattedDate = date ? new Date(date).toLocaleString('en-AU', {
    dateStyle: 'medium', timeStyle: 'short',
  }) : new Date().toLocaleString('en-AU')
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New user signup on Wedding Waitress</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New User Signup</Heading>
          <Text style={text}>A new user has signed up:</Text>
          <Text style={row}><strong>Name:</strong> {fullName || '—'}</Text>
          <Text style={row}><strong>Email:</strong> {email || '—'}</Text>
          <Text style={row}><strong>Signup Date:</strong> {formattedDate}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminNewSignupEmail,
  subject: 'New User Signup – Wedding Waitress',
  to: 'support@weddingwaitress.com.au',
  displayName: 'Admin: new signup',
  previewData: { fullName: 'Jane Smith', email: 'jane@example.com', date: new Date().toISOString() },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#3D2E1E', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3D2E1E', lineHeight: '1.6', margin: '0 0 16px' }
const row = { fontSize: '15px', color: '#3D2E1E', lineHeight: '1.6', margin: '0 0 8px' }
