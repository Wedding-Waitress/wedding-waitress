

# Auto-Dynamic QR Codes for All Events

## What Changes

### 1. Auto-create a dynamic QR code when an event is created
In `useEvents.ts` `createEvent()`, after the event is inserted and we have the new event ID, automatically:
- Call `supabase.rpc('generate_dynamic_qr_code')` to get a short code
- Insert a row into `dynamic_qr_codes` with `current_event_id` set to the new event, `destination_type: 'guest_lookup'`, and a default label (event name)

### 2. Make the QR code generator use the dynamic URL
In `QRCodeMainCard.tsx`, instead of encoding `/s/{slug}` (static), look up the event's dynamic QR code from `dynamic_qr_codes` table and encode `/qr/{code}` instead. The user sees no difference -- same QR customization UI, same preview -- but the encoded URL is now dynamic.

- Add a query in the component (or a small hook) to fetch the `dynamic_qr_codes` row for the selected event
- Replace `eventUrl` from `buildGuestLookupUrl(slug)` to `buildDynamicQRUrl(code)`
- Fallback: if no dynamic code exists yet (legacy events), auto-create one on the fly

### 3. Remove the DynamicQRManager section from the QR Code page
Remove the `<DynamicQRManager />` component from `QRCodeSeatingChart.tsx` (line 172). This hides the manual creation UI from regular users. The component files stay in the codebase for future vendor use.

### 4. Update link copy/live view to use the dynamic URL
The "Copy Link" and "Live View" buttons in `QRCodeMainCard.tsx` and `QRCodeSeatingChart.tsx` currently use `buildGuestLookupUrl`. These should also use the dynamic URL so the copied link matches what the QR encodes.

## Files Modified
- `src/hooks/useEvents.ts` -- add dynamic QR auto-creation after event insert
- `src/components/Dashboard/QRCode/QRCodeMainCard.tsx` -- swap `eventUrl` to use dynamic QR code URL
- `src/components/Dashboard/QRCode/QRCodeSeatingChart.tsx` -- remove `<DynamicQRManager />` and its import
- `src/lib/invitationQR.ts` -- update to use dynamic URL if available

## What Does NOT Change
- The `dynamic_qr_codes` and `qr_scan_logs` tables, RLS, and edge function remain as-is
- The `/qr/:code` route and `qr-redirect` edge function remain as-is
- Static `/s/{slug}` routes continue to work (backward compatibility)
- The QR code customization UI is untouched
- `DynamicQRManager.tsx` and `QRAnalyticsDashboard.tsx` files are kept for future vendor features

