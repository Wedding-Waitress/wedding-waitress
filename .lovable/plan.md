

## Remove Image Positioning, Rename Section

**Changes in `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`:**

1. **Lines 540-586**: Remove the "Image Positioning" heading, "Horizontal Position" field, and "Vertical Position" field. Keep only the "Image Opacity" field, but move it outside the conditional block (or keep it inside with a new heading).

Specifically:
- Replace lines 540-586 with a block that only contains "Image Opacity" (still conditional on having a full background image).
- Rename the heading from "Image Positioning" to "Invitation Customisation".

2. **Lines 588-594**: Keep "Card Background Color" as-is, but group it under the new "Invitation Customisation" heading along with Image Opacity.

**Result structure:**
```
Invitation Customisation (heading)
├── Image Opacity (only when background image exists)
└── Card Background Color
```

Lines 540-594 become:

```tsx
{currentSettings.background_image_type === 'full' && currentSettings.background_image_url && (
  <div className="space-y-2 pt-4 border-t">
    <Label>Image Opacity</Label>
    <Select
      value={String(currentSettings.background_image_opacity || 100)}
      onValueChange={(value) => handleSettingChange('background_image_opacity', Number(value))}
    >
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
          <SelectItem key={val} value={String(val)}>{val}%</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}

<div className="space-y-4 pt-4 border-t">
  <h4 className="text-sm font-medium">Invitation Customisation</h4>
  <div className="space-y-2">
    <Label>Card Background Color</Label>
    <ColorPickerPopover
      value={currentSettings.background_color}
      onChange={(color) => handleSettingChange('background_color', color)}
    />
  </div>
</div>
```

