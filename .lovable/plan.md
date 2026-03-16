

## Fix Preset Zone Reset to Restore Proper Default Values

**Problem**: When clicking Reset on a preset zone (e.g., Event Date), it resets `text` to `''` (which falls back to raw `eventData` like `20/12/2026`), uses wrong font (`Inter` instead of `ET Emilia Grace Demo`), wrong size (24px instead of 20px), and wrong position (50% instead of the preset default).

**Root cause**: `onZoneReset` in `InvitationsPage.tsx` (lines 438-460) uses hardcoded generic defaults instead of the preset-specific values defined in `InvitationCardCustomizer.tsx`.

**Fix** (two files):

### 1. `InvitationCardCustomizer.tsx` — Export the constants
Export `PRESET_ZONES`, `PRESET_Y_POSITIONS`, and `PRESET_STYLES` so they can be reused.

### 2. `InvitationsPage.tsx` — Rewrite `onZoneReset` handler
Import the exported constants and update the reset handler (lines 438-460) to:

```ts
onZoneReset={(zoneId) => {
  const zones = activeArtwork?.text_zones || [];
  const zone = zones.find(z => z.id === zoneId);
  if (!zone) return;

  // Find the preset definition to get proper defaults
  const preset = PRESET_ZONES.find(p => p.field === zone.preset_field);
  const style = zone.preset_field ? PRESET_STYLES[zone.preset_field] : undefined;
  const defaultY = zone.preset_field ? PRESET_Y_POSITIONS[zone.preset_field] : 50;

  // Get proper formatted text from getText() or eventData fallback
  const defaultText = preset?.getText
    ? preset.getText(eventData)
    : (zone.preset_field ? eventData[zone.preset_field] || preset?.defaultText || '' : '');

  const newZones = zones.map(z =>
    z.id === zoneId ? {
      ...z,
      text: defaultText,
      font_family: style?.font_family || 'ET Emilia Grace Demo',
      font_size: style?.font_size || 20,
      font_color: '#000000',
      font_weight: 'normal',
      font_style: 'normal',
      text_align: 'center',
      text_case: 'default',
      x_percent: 50,
      y_percent: defaultY ?? 50,
      width_percent: 80,
      rotation: 0,
    } : z
  );
  updateSettings({ text_zones: newZones });
}}
```

This ensures Reset restores the properly formatted text (e.g., "Event Date - Saturday, the 20th of December 2026"), correct font, size, and Y position for every preset zone.

