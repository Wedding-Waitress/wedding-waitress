

# Dynamic QR Code System

## Current State
- QR codes encode a hardcoded URL (`/s/{event-slug}`) — static, cannot be reassigned
- `event_shortlinks` table exists but maps 1:1 to events with no reassignment capability
- No scan analytics are captured

## Proposed Architecture

### 1. New Database Table: `dynamic_qr_codes`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| user_id | uuid | Owner |
| code | text (unique) | Short code (e.g., `Xk9mP`) |
| label | text | Friendly name (e.g., "Venue Front Desk") |
| current_event_id | uuid, nullable | Currently linked event |
| destination_type | text | `guest_lookup` / `kiosk` / `custom` |
| is_active | boolean | Enable/disable |
| created_at | timestamptz | |

### 2. New Database Table: `qr_scan_logs`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| qr_code_id | uuid | FK to dynamic_qr_codes |
| event_id | uuid, nullable | Event at time of scan |
| scanned_at | timestamptz | Timestamp |
| user_agent | text | Device info |
| ip_hash | text | Anonymized IP for unique visitor count |
| referrer | text, nullable | |

### 3. New Edge Function: `qr-redirect`
- Receives the short code from the URL
- Logs the scan to `qr_scan_logs`
- Looks up `dynamic_qr_codes` to find the current destination
- Returns a 302 redirect to the appropriate URL (`/s/{slug}` or `/kiosk/{slug}`)
- If inactive or no event linked, shows a branded "no event" page

### 4. New Public Route: `/qr/:code`
- A lightweight React page that calls the edge function and redirects
- Shows a brief branded loading state

### 5. Dashboard UI Changes
- Add a "Dynamic QR Codes" section/tab within the existing QR Code Seating Chart page (or as a sub-section)
- Create/manage dynamic QR codes with labels
- Toggle which event a code points to (dropdown of user's events)
- Toggle destination type (Guest Lookup vs. Kiosk)
- View scan analytics: total scans, unique visitors, scans over time chart
- Download the dynamic QR code image

### 6. Integration with Existing QR Generator
- The existing `advancedQRGenerator` and customization UI remain unchanged (locked)
- A new option is added: "Generate as Dynamic QR" which encodes `/qr/{code}` instead of `/s/{slug}`
- Existing static QR codes continue to work as-is

## What Does NOT Change
- The locked QR Code Seating Chart page logic, customization, and generation
- Existing static QR URLs (`/s/{slug}`) continue working
- Kiosk and Guest Lookup pages are unmodified

## Files to Create/Modify
- **New migration**: Create `dynamic_qr_codes` and `qr_scan_logs` tables with RLS
- **New edge function**: `supabase/functions/qr-redirect/index.ts`
- **New route**: `/qr/:code` in App.tsx
- **New components**: `DynamicQRManager.tsx`, `QRAnalyticsDashboard.tsx`
- **New hook**: `useDynamicQRCodes.ts`
- **Minor addition** to QR Code page: link/button to access Dynamic QR management

## Corporate Kiosk Value
- Venues get a permanent QR code they never need to reprint
- Event hosts see real-time scan analytics
- Corporate clients can track check-in volume, peak arrival times, device breakdown

