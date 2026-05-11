## Scope
QR Code Seating Chart Sign page (`/dashboard?tab=signage`) — Export Controls only.

## Change
In `src/components/Dashboard/Signage/SignagePage.tsx`:

1. Remove the "Download PNG" button (lines 325–332).
2. Update the PDF button label from "Download PDF" → "Download Print-Ready PDF" (line 323, plus the "Exporting…" state stays).
3. Update the helper text on line 314 from "Download your sign as PDF or PNG ready for printing." → "Download your sign as a print-ready PDF."
4. Update the bullet on line 277 from "PDF/PNG match the live preview exactly" → "PDF matches the live preview exactly".

## Out of scope
- PDF export logic (`handleDownloadPDF`, `exportInvitationPDF`) — untouched.
- `handleDownloadPNG` function and `exportInvitationPNG` import will be left in place (dead code, harmless) to keep the change minimal and reversible. Can be cleaned up later if you want.
- No layout, template, QR, styling, DB, or other-page changes.
- Invitations page (`InvitationExporter.tsx`) — not touched.
