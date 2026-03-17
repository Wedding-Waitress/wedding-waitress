

## Fix PDF Download Filename

### Format
`Invitations-WeddingWaitress-{EventName}.pdf`

Example: If event name is "Jason & Lindas Wedding", the file downloads as:
`Invitations-WeddingWaitress-Jason & Lindas Wedding.pdf`

### Changes

**1. `src/lib/invitationExporter.ts`** — Add optional `fileName` parameter to `exportInvitationPDF`:
```ts
export async function exportInvitationPDF(opts, guestName?, fileName?): Promise<void> {
  // ... existing logic ...
  pdf.save(fileName || `invitation.pdf`);
}
```

**2. `src/components/Dashboard/Invitations/InvitationsPage.tsx`** — Build filename from selected event and pass it:
```ts
const eventName = selectedEvent?.name || 'Event';
const pdfFileName = `Invitations-WeddingWaitress-${eventName}.pdf`;
await exportInvitationPDF(exportOpts, undefined, pdfFileName);
```

Two files, two small edits.

