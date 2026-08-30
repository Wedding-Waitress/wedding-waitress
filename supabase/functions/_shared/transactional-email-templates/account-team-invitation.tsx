/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { accountHolderEmail?: string; acceptUrl?: string; expiresAt?: string }

const AccountTeamInvitation = ({ accountHolderEmail, acceptUrl, expiresAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have been invited to a Wedding Waitress account</Preview>
    <Body style={main}><Container style={container}>
      <Heading style={heading}>Join a Wedding Waitress account</Heading>
      <Text style={text}>{accountHolderEmail || 'A Wedding Waitress account holder'} has invited you to help manage their events.</Text>
      <Text style={text}>Use the secure button below and sign in with this email address. The invitation can only be accepted once.</Text>
      <Section style={{ margin: '28px 0' }}><Button href={acceptUrl || '#'} style={button}>Accept invitation</Button></Section>
      <Text style={small}>This invitation expires {expiresAt ? new Date(expiresAt).toLocaleDateString('en-AU') : 'in 14 days'}. If you were not expecting it, you can safely ignore this email.</Text>
      <Text style={small}>— The Wedding Waitress Team</Text>
    </Container></Body>
  </Html>
)

export const template = {
  component: AccountTeamInvitation,
  subject: 'You have been invited to Wedding Waitress',
  displayName: 'Account team invitation',
  previewData: { accountHolderEmail: 'owner@example.com', acceptUrl: 'https://weddingwaitress.com.au', expiresAt: '2026-09-13T00:00:00Z' },
} satisfies TemplateEntry

const main = { backgroundColor: '#fffaf3', fontFamily: 'Manrope, Arial, sans-serif' }
const container = { backgroundColor: '#ffffff', padding: '36px 30px', maxWidth: '560px', border: '1px solid #e8d8c2', borderRadius: '16px' }
const heading = { color: '#472c1d', fontSize: '24px', fontWeight: 600, margin: '0 0 20px' }
const text = { color: '#472c1d', fontSize: '15px', lineHeight: '1.65', margin: '0 0 15px' }
const small = { color: '#6e625b', fontSize: '13px', lineHeight: '1.55', margin: '12px 0 0' }
const button = { backgroundColor: '#278b48', color: '#ffffff', padding: '12px 22px', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }
