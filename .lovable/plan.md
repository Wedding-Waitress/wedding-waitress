

## Fix: PDF Export Missing Text

### Root Cause

The `buildInvitationElement` in `invitationExporter.ts` was written for an older data model and doesn't match the current `TextZone` interface. Specifically:

| What exporter expects | What zones actually have |
|---|---|
| `customText[zone.id]` from `zone.default_text` | `zone.text` (the actual display text) |
| `zone.type === 'auto'` + `zone.auto_field` | `zone.type === 'preset'` + `zone.preset_field` |
| `zone.letter_spacing` | No `letter_spacing` field on current TextZone |

The preview component (`InvitationCardPreview.tsx` line 76-82) correctly resolves text via:
```ts
if (zone.text) return zone.text;
if (zone.type === 'preset' && zone.preset_field) return eventData[zone.preset_field] || '';
```

But the exporter never reads `zone.text` or `zone.preset_field`, so every zone gets empty text → nothing renders.

### Fix — Two changes

**1. `handleDownloadPDF` in `InvitationsPage.tsx` (lines 141-147)**

Build `customText` using the same logic as the preview's `getZoneText`:
```ts
textZones.forEach((z: any) => {
  if (z.text) {
    customText[z.id] = z.text;
  } else if (z.type === 'preset' && z.preset_field) {
    customText[z.id] = eventData[z.preset_field] || '';
  }
});
```

**2. `buildInvitationElement` in `invitationExporter.ts` (lines 63-73)**

Add a fallback that also checks `zone.text` and `zone.preset_field` so the exporter works with the current data model regardless of how `customText` is built:
```ts
let text = customText[zone.id] || '';
if (!text && (zone as any).text) text = (zone as any).text;
if (!text && zone.type === 'preset' && (zone as any).preset_field && eventData[(zone as any).preset_field]) {
  text = eventData[(zone as any).preset_field];
}
// ... existing auto_field and guest_name fallbacks ...
```

Also guard `letter_spacing` with a fallback to `0` since the current TextZone interface doesn't have it.

These two changes ensure the exported PDF text matches what's shown in the preview.

