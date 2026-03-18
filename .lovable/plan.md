

## Analysis: Features Already Implemented — DB Bug Prevents Persistence

The interactive text manipulation (drag, resize, rotate) on Name Place Cards is **already fully implemented** in `PlaceCardPreview.tsx` using the same `InteractiveTextOverlay` component as Invitations. The code includes:

- Drag handlers (`handleGuestNameMove`, `handleTableSeatMove`) with mm-based coordinate conversion
- Font size scaling via corner resize (`handleGuestNameFontSize`, `handleTableSeatFontSize`)
- Rotation with snap-to-zero (`handleGuestNameRotate`, `handleTableSeatRotate`)
- Reset handlers for both elements
- Bounding box selection, toolbar (Reset/Duplicate/Delete)

**The real problem** is a database error preventing saves from completing, which causes positions to snap back after dragging:

```
Error: null value in column "guest_name_offset_x" of relation "place_card_settings" violates not-null constraint
```

### Root Cause

`normalizeRow()` in `usePlaceCardSettings.ts` does not normalize offset/rotation fields. If any edge case returns these as `null` or `undefined` from the DB (e.g., stale cache, race condition), the `safeDefaults` in `saveSettings` may not fully protect against it because `settings` state could carry forward null values.

### Fix

**File: `src/hooks/usePlaceCardSettings.ts`** — Update `normalizeRow` (lines 102-113) to explicitly default all NOT NULL offset/rotation fields:

```typescript
function normalizeRow(row: any): PlaceCardSettings {
  return {
    ...row,
    background_image_type: row.background_image_type as PlaceCardSettings['background_image_type'],
    individual_messages: (row.individual_messages as Record<string, string>) ?? {},
    message_font_family: row.message_font_family || 'Beauty Mountains',
    message_font_size: row.message_font_size ?? 16,
    message_font_color: row.message_font_color || '#000000',
    message_bold: row.message_bold ?? false,
    message_italic: row.message_italic ?? false,
    message_underline: row.message_underline ?? false,
    // Ensure NOT NULL offset/rotation fields always have numeric values
    guest_name_offset_x: row.guest_name_offset_x ?? 0,
    guest_name_offset_y: row.guest_name_offset_y ?? 0,
    table_offset_x: row.table_offset_x ?? 0,
    table_offset_y: row.table_offset_y ?? 0,
    seat_offset_x: row.seat_offset_x ?? 0,
    seat_offset_y: row.seat_offset_y ?? 0,
    guest_name_rotation: row.guest_name_rotation ?? 0,
    table_seat_rotation: row.table_seat_rotation ?? 0,
    info_bold: row.info_bold ?? false,
    info_italic: row.info_italic ?? false,
    info_underline: row.info_underline ?? false,
    info_font_color: row.info_font_color || '#000000',
  };
}
```

This single change ensures all NOT NULL fields are always populated in the application state, eliminating the null constraint violation and allowing drag/resize/rotate positions to persist correctly.

### Files changed: 1

