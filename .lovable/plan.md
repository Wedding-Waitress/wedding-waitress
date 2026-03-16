

## Add "Text Style" Dropdown to Text Zones

**What**: Add a "Text Style" dropdown next to the Font Color field in every text zone (preset and custom), with options: Default, Bold, Italic, Underline. Selection applies styling to the invitation canvas in real time.

**How**:

### 1. `InvitationCardCustomizer.tsx`
- Add a "Text Style" dropdown after the Font Color section (around line 365), using the existing `font_style` field on each zone:
```tsx
<div>
  <Label className="text-xs">Text Style</Label>
  <Select value={zone.font_style} onValueChange={(v) => updateZone(zone.id, { font_style: v })}>
    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="default">Default</SelectItem>
      <SelectItem value="bold">Bold</SelectItem>
      <SelectItem value="italic">Italic</SelectItem>
      <SelectItem value="underline">Underline</SelectItem>
    </SelectContent>
  </Select>
</div>
```
- Wrap the Font Color and Text Style fields in a `grid grid-cols-2 gap-2` layout so they sit side by side.

### 2. `InvitationCardPreview.tsx` (line ~219-220)
- Update the style mapping to derive `fontWeight`, `fontStyle`, and `textDecoration` from `font_style`:
```tsx
fontWeight: zone.font_style === 'bold' ? '700' : '400',
fontStyle: zone.font_style === 'italic' ? 'italic' : 'normal',
textDecoration: zone.font_style === 'underline' ? 'underline' : 'none',
```

### 3. `invitationExporter.ts`
- Add matching `text-decoration` and update `font-weight`/`font-style` logic to use the `font_style` field for export consistency.

No schema changes needed -- `font_style` already exists on the `TextZone` interface with a default of `'normal'`. Will map `'normal'` to behave same as `'default'`.

