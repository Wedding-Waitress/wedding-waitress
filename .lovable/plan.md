

## Redesign Design Tab — Match Screenshot Layout

The current implementation is close but the **Text Styling** section layout differs from the screenshot. The screenshot shows Bold/Italic/Underline as a **vertical list** (each on its own row with the toggle on the right), while the current code renders them **horizontally inline**.

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

**In both Guest Name and Table & Seat boxes**, replace the horizontal text styling layout with a vertical stack:

Current (horizontal):
```tsx
<div className="flex items-center gap-3">
  <div className="flex items-center gap-1.5">
    <Label>Bold</Label><Switch />
  </div>
  ...
</div>
```

Target (vertical, matching screenshot):
```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label>Bold</Label><Switch />
  </div>
  <div className="flex items-center justify-between">
    <Label>Italic</Label><Switch />
  </div>
  <div className="flex items-center justify-between">
    <Label>Underline</Label><Switch />
  </div>
</div>
```

Each toggle row uses `justify-between` so the label is on the left and the switch is on the right, exactly as shown in the screenshot.

No other files or database changes needed — this is a layout-only fix within the Design tab.

