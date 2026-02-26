

# Update Modal Header Text & Spacing

## Changes (in `src/components/GuestLookup/PublicAddGuestModal.tsx`)

### 1. Add top gap above "Add Extra Guest"
Add `pt-4` (or `mt-4`) to the `DialogHeader` so there's a visible empty gap between the top of the modal and the title.

### 2. Replace subtitle with color-coded two-line text
Replace the current single-line subtitle with two lines:
- Line 1: "Choose if the extra guest is an"
- Line 2: **Individual**, your partner (**Couple**) or **Family**

Where:
- "Individual" is styled in **pink** (matching the pink pill color, e.g. `text-pink-500`)
- "Couple" is styled in **orange** (`text-orange-500`)
- "Family" is styled in **blue** (`text-blue-600`)

The rest of the text remains the default muted-foreground color.

## Technical Details

**Line 176-183** -- Update `DialogHeader`:
```tsx
<DialogHeader className="pt-4">
  <DialogTitle className="text-xl sm:text-2xl font-medium text-primary">
    Add Extra Guest
  </DialogTitle>
  <p className="text-sm text-muted-foreground mt-3 pr-12">
    Choose if the extra guest is an<br />
    <span className="text-pink-500 font-medium">Individual</span>, your partner (<span className="text-orange-500 font-medium">Couple</span>) or <span className="text-blue-600 font-medium">Family</span>.
  </p>
</DialogHeader>
```

