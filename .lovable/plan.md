

# Dynamic QR Code System - Implementation Plan

## Overview

Convert the current static QR code system (hardcoded `/s/{slug}`) into a dynamic system where QR codes encode a permanent short URL (`/qr/{code}`) that can be reassigned to different events. Includes scan analytics for corporate/venue use.

## Phase 1: Database Tables & Functions (Migration)

Create two new tables and supporting functions:

**`dynamic_qr_codes`** table:
- `id` (uuid PK), `user_id` (uuid FK auth.users, NOT NULL), `code` (text UNIQUE), `label` (text), `current_event_id` (uuid FK events, nullable), `destination_type` (text, default `guest_lookup`), `is_active` (boolean, default true), `created_at` (timestamptz)

**`qr_scan_logs`** table:
- `id` (uuid PK), `qr_code_id` (uuid FK dynamic_qr_codes), `event_id` (uuid nullable), `scanned_at` (timestamptz), `user_agent` (text), `ip_hash` (text), `referrer` (text nullable)

**Functions:**
- `generate_dynamic_qr_code()` - generates unique 6-char alphanumeric codes
- `resolve_dynamic_qr(text)` - SECURITY DEFINER function that resolves a code to its destination URL (returns event slug + destination type), used by the edge function

**RLS:** Owner-only CRUD on `dynamic_qr_codes`; service_role INSERT on `qr_scan_logs`; owner SELECT on `qr_scan_logs`

**Indexes:** On `code`, `user_id`, `qr_code_id`, `scanned_at`

## Phase 2: Edge Function (`qr-redirect`)

New edge function at `supabase/functions/qr-redirect/index.ts`:
- Receives `code` parameter
- Calls `resolve_dynamic_qr` RPC to get destination
- Logs scan to `qr_scan_logs` (user_agent, hashed IP)
- Returns 302 redirect to `/s/{slug}` or `/kiosk/{slug}`
- If inactive/no event: returns branded HTML "no event" page
- `verify_jwt = false` (public access)

## Phase 3: Frontend Route (`/qr/:code`)

Add `/qr/:code` route in `App.tsx` pointing to a new `QRRedirect.tsx` page:
- Shows brief branded loading spinner
- Calls the `qr-redirect` edge function
- Redirects to the resolved URL
- Shows error state if code is invalid/inactive

## Phase 4: Dashboard UI - Dynamic QR Management

**New files:**
- `src/hooks/useDynamicQRCodes.ts` - CRUD hook for dynamic QR codes
- `src/components/Dashboard/QRCode/DynamicQRManager.tsx` - management UI
- `src/components/Dashboard/QRCode/QRAnalyticsDashboard.tsx` - scan analytics

**DynamicQRManager** (rendered below the existing QR Code Generator on the QR Code Seating Chart page):
- Create new dynamic QR codes with custom labels
- Dropdown to assign/reassign to any of the user's events
- Toggle destination type (Guest Lookup vs Kiosk)
- Toggle active/inactive
- Download the dynamic QR code image (uses existing `AdvancedQRGenerator` with `/qr/{code}` URL)
- Copy permanent link button

**QRAnalyticsDashboard** (within each dynamic QR card or expandable section):
- Total scans, unique visitors (by ip_hash)
- Scans over time (simple bar/line chart using Recharts, already installed)
- Peak scan times

**Integration with existing QR page:**
- Add a new section/card below the existing QR Code Generator in `QRCodeSeatingChart.tsx` titled "Dynamic QR Codes"
- This does NOT modify the locked QR generator logic -- it's a new card appended below

## Phase 5: URL Utility

Add `buildDynamicQRUrl(code: string)` to `src/lib/urlUtils.ts`

## What Does NOT Change
- The locked `QRCodeMainCard.tsx` generator logic, customization, and export
- Existing static QR URLs (`/s/{slug}`) continue working
- Kiosk and Guest Lookup pages are unmodified
- Sidebar remains unchanged (Dynamic QR is accessed within the existing QR Code tab)

## File Summary

| Action | File |
|--------|------|
| New migration | `dynamic_qr_codes`, `qr_scan_logs` tables + functions |
| New edge function | `supabase/functions/qr-redirect/index.ts` |
| New config | Add `[functions.qr-redirect]` to `supabase/config.toml` |
| New page | `src/pages/QRRedirect.tsx` |
| New hook | `src/hooks/useDynamicQRCodes.ts` |
| New component | `src/components/Dashboard/QRCode/DynamicQRManager.tsx` |
| New component | `src/components/Dashboard/QRCode/QRAnalyticsDashboard.tsx` |
| Edit | `src/App.tsx` - add `/qr/:code` route |
| Edit | `src/lib/urlUtils.ts` - add `buildDynamicQRUrl` |
| Edit | `src/components/Dashboard/QRCode/QRCodeSeatingChart.tsx` - append Dynamic QR section below existing content (no changes to locked logic) |

