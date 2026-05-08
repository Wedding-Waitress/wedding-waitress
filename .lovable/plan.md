## Wire "RSVP Command Centre" card to scroll to Guest List operations

Single file change: `src/components/Dashboard/GuestListTable.tsx`.

### 1. Add stable anchor id
On the "Control Buttons Row" wrapper (line 1941) — the top of the controls area sitting directly above the guest table and above the "Send digital invites & RSVP's to your guests…" instruction — add:

```tsx
<div id="smart-rsvp-command-centre" className="flex items-center justify-between gap-2 flex-wrap mb-4 sm:mb-6 mt-4">
```

This is the correct anchor: it's the first element of the RSVP operations toolbar that contains the "Send digital invites…" instruction (both mobile + desktop variants live inside it).

### 2. Update onCommandCentre handler
Replace current handler (line 1697–1699) which scrolls to `guest-list-table-anchor` with:

```tsx
onCommandCentre={() => {
  document
    .getElementById('smart-rsvp-command-centre')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}}
```

### Out of scope (untouched)
- `SmartRsvpFeatureStrip.tsx` visual design
- Locked desktop guest list table
- Step 1 / 2 / 3 cards
- Mobile/tablet layouts
- Routing, modals, other feature-strip handlers
