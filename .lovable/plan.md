

## Replace QR Code Color Inputs with ColorPickerPopover

**What**: Replace the 4 native color inputs (Background, Dots, Marker Border, Marker Center) in the QR Code "Design Your QR Code" Color accordion with the same `ColorPickerPopover` component used in Name Place Cards.

### File: `src/components/Dashboard/QRCode/QRCodeMainCard.tsx`

**Import**: Add `import { ColorPickerPopover } from '@/components/ui/color-picker-popover';`

**Lines 528-556** — Replace the 4 color input groups (each currently using `<input type="color">` + `<Input>` hex field) with `<ColorPickerPopover>`:

```tsx
<div className="grid grid-cols-2 gap-2">
  <div className="space-y-1">
    <Label className="text-sm">Background</Label>
    <ColorPickerPopover value={qrColors.background} onChange={(c) => updateColors({ background: c })} />
  </div>
  <div className="space-y-1">
    <Label className="text-sm">Dots</Label>
    <ColorPickerPopover value={qrColors.dotsColor} onChange={(c) => updateColors({ dotsColor: c })} />
  </div>
  <div className="space-y-1">
    <Label className="text-sm">Marker Border</Label>
    <ColorPickerPopover value={qrColors.markerBorderColor} onChange={(c) => updateColors({ markerBorderColor: c })} />
  </div>
  <div className="space-y-1">
    <Label className="text-sm">Marker Center</Label>
    <ColorPickerPopover value={qrColors.markerCenterColor} onChange={(c) => updateColors({ markerCenterColor: c })} />
  </div>
</div>
```

No other files or components are changed. The `ColorPickerPopover` component already exists at `src/components/ui/color-picker-popover.tsx` and needs no modifications.

