

## Fix: Enable the Download PDF Button on Invitations Page

### Problem
The "Download PDF" button in the Export Controls section (line 265 of `InvitationsPage.tsx`) has `disabled` hardcoded and no `onClick` handler, making it permanently faded and unclickable.

### Fix — Single file: `src/components/Dashboard/Invitations/InvitationsPage.tsx`

1. **Import `exportInvitationPDF`** from `@/lib/invitationExporter` and `useToast` from `@/hooks/use-toast`.

2. **Add state** for `exporting` (boolean) to show a loading state during export.

3. **Create a `handleDownloadPDF` handler** that:
   - Checks `activeArtwork` exists (needs background image and text zones)
   - Builds the `ExportOptions` object from `activeArtwork` settings and `eventData`
   - Calls `exportInvitationPDF(exportOpts)`
   - Shows a toast on success/error

4. **Update the button**:
   - Remove hardcoded `disabled` — instead disable only when `!activeArtwork || exporting`
   - Add `onClick={handleDownloadPDF}`
   - Show a spinner icon when `exporting` is true

### Export options mapping
The active artwork's settings map to `ExportOptions` as follows:
- `backgroundUrl` → `activeArtwork.background_image_url`
- `orientation` → `activeArtwork.orientation`
- `widthMm` / `heightMm` → derived from `activeArtwork.card_size` (A4: 210×297, A5: 148×210, A6: 105×148)
- `textZones` → `activeArtwork.text_zones` (adapted to match the `TextZone` type from `useInvitationTemplates`)
- `customText` / `customStyles` → built from `activeArtwork.text_zones` entries
- `eventData` → already available
- `qrConfig` / `qrDataUrl` → already in state

