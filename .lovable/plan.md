

## Remove Slider Sections from Text Position Tab

### What Changes
In `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`, remove the entire content below the Text Edit Mode toggle in the "position" tab — specifically lines 466–715 which contain:

- The description paragraph ("Adjust the position...")
- Guest Name Position section (Horizontal/Vertical inputs + sliders)
- Guest Name Rotation slider
- Table & Seat Number Position section (Horizontal/Vertical inputs + sliders)
- Table & Seat Rotation slider
- Reset to Default button

Replace with a simple helper message explaining that users should enable Text Edit Mode and drag text directly on the canvas.

### Technical Details

**File: `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`**

Lines 466–715 will be replaced with:
```tsx
<p className="text-sm text-muted-foreground">
  Enable Text Edit Mode above, then drag text elements directly on the card preview to reposition them.
</p>

<div className="pt-4">
  <Button 
    onClick={async () => {
      await onSettingsChange({
        guest_name_offset_x: 0,
        guest_name_offset_y: 0,
        table_offset_x: 0,
        table_offset_y: 0,
        seat_offset_x: 0,
        seat_offset_y: 0,
        guest_name_rotation: 0,
        table_seat_rotation: 0,
      });
      toast({
        title: "Position Reset",
        description: "All text positions have been reset to default"
      });
    }} 
    variant="destructive" 
    className="w-full rounded-full"
  >
    Reset to Default
  </Button>
</div>
```

The local state variables (`localGuestNameOffsetX`, `inputGuestX`, etc.) and their `useState`/`useEffect` declarations can be left in place — they become unused but harmless, and removing them risks breaking other references. A cleanup pass can be done separately.

The Reset to Default button is preserved since users still need a way to reset positions back to center.

