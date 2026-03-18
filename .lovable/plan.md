

## Fix: Dragged Text Position Not Persisting

### Root Cause

The console shows: `null value in column "guest_name_offset_x" of relation "place_card_settings" violates not-null constraint` during UPDATE operations.

The `place_card_settings` table has NOT NULL constraints on offset columns (`guest_name_offset_x`, `guest_name_offset_y`, `table_offset_x`, `table_offset_y`, `seat_offset_x`, `seat_offset_y`, `guest_name_rotation`, `table_seat_rotation`). Existing rows created before these constraints were added still have NULL values in those columns. When any UPDATE is performed, Postgres's `update_updated_at_column` trigger forces full-row validation via `RETURN NEW`, causing the NOT NULL check to fail on the legacy NULL values.

This means **every save attempt fails**, so the position never persists and the text snaps back after dragging.

### Fix

**File: `src/hooks/usePlaceCardSettings.ts`**

In the `saveSettings` function, before calling `.update()`, merge the update payload with safe defaults for all NOT NULL columns. This ensures that even if the existing row has legacy NULLs, the UPDATE will set them to valid defaults:

```typescript
// Before the .update() call, ensure all NOT NULL columns have safe values
const safeDefaults = {
  guest_name_offset_x: baseSettings.guest_name_offset_x ?? 0,
  guest_name_offset_y: baseSettings.guest_name_offset_y ?? 0,
  table_offset_x: baseSettings.table_offset_x ?? 0,
  table_offset_y: baseSettings.table_offset_y ?? 0,
  seat_offset_x: baseSettings.seat_offset_x ?? 0,
  seat_offset_y: baseSettings.seat_offset_y ?? 0,
  guest_name_rotation: (baseSettings as any).guest_name_rotation ?? 0,
  table_seat_rotation: (baseSettings as any).table_seat_rotation ?? 0,
  info_font_color: baseSettings.info_font_color ?? '#000000',
  message_font_family: baseSettings.message_font_family ?? 'Beauty Mountains',
  message_font_color: baseSettings.message_font_color ?? '#000000',
  message_font_size: baseSettings.message_font_size ?? 16,
  message_bold: baseSettings.message_bold ?? false,
  message_italic: baseSettings.message_italic ?? false,
  message_underline: baseSettings.message_underline ?? false,
  info_bold: baseSettings.info_bold ?? false,
  info_italic: baseSettings.info_italic ?? false,
  info_underline: baseSettings.info_underline ?? false,
};

const { data, error } = await supabase
  .from('place_card_settings')
  .update({
    ...safeDefaults,    // Fill any legacy NULLs
    ...newSettings,     // Apply the user's actual changes (overrides defaults)
    event_id: eventId,
    user_id: user.id,
  })
  .eq('id', baseSettings.id)
  .select()
  .single();
```

This single change fixes both issues:
1. **Save errors stop** — all NOT NULL columns are guaranteed to have values in every UPDATE
2. **Position persists** — successful saves mean `setSettings(normalizeRow(data))` fires, the DB state syncs, `localOverrides` clears, and all cards render at the new position
3. **All cards update in real-time** — the position is stored in shared settings (not per-card), so all cards already use the same offset values from settings

No changes needed to the preview, customizer, or InteractiveTextOverlay components. The existing local-state buffering pattern (`localOverrides` + `handlePreviewSettingsChange`) is already correct — it just needs the underlying save to succeed.

### Files Changed
- `src/hooks/usePlaceCardSettings.ts` — Add safe NOT NULL defaults merge before `.update()` call

