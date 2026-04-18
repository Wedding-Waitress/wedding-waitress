/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY without explicit owner approval.
 * Welcome email sent to new users immediately after sign-up verification.
 */
/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WelcomeProps {
  firstName?: string
}

const WelcomeEmail = ({ firstName }: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Wedding Waitress — your 7-day free trial starts now</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Wedding Waitress 🎉</Heading>
        <Text style={text}>Hi {firstName || 'there'},</Text>
        <Text style={text}>
          Welcome to Wedding Waitress! You now have a <strong>7-day free trial</strong> to plan
          your wedding or event with ease.
        </Text>
        <Text style={text}>During your trial, you can:</Text>
        <ul style={list}>
          <li style={listItem}>Create your guest list</li>
          <li style={listItem}>Organise your tables</li>
          <li style={listItem}>Send invitations</li>
          <li style={listItem}>And much more</li>
        </ul>
        <Text style={text}>
          After your trial ends, you can choose a plan that suits your needs.
        </Text>
        <Section style={buttonSection}>
          <Button href="https://weddingwaitress.com/dashboard" style={button}>
            Start planning your event
          </Button>
        </Section>
        <Text style={text}>We're excited to have you!</Text>
        <Text style={signoff}>– The Wedding Waitress Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to Wedding Waitress 🎉',
  displayName: 'Welcome (new user)',
  previewData: { firstName: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#3D2E1E', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#3D2E1E', lineHeight: '1.6', margin: '0 0 16px' }
const list = { paddingLeft: '20px', margin: '0 0 16px', color: '#3D2E1E' }
const listItem = { fontSize: '15px', lineHeight: '1.8' }
const buttonSection = { margin: '28px 0' }
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
