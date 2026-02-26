
# Add RSVP Icon, Align Row, Restyle Edit Button, and Match Font Sizes

## Changes (all in `src/components/GuestLookup/EnhancedGuestCard.tsx`)

### 1. Add purple RSVP icon and match row layout
Wrap the RSVP section in the same layout as Table/Seat/Dietary rows: `flex items-start gap-3 p-2 bg-background-subtle rounded-lg` with a `ClipboardCheck` icon (purple, `w-5 h-5 text-primary`) on the left. Import `ClipboardCheck` from lucide-react.

### 2. Make "RSVP Status" text consistent with other row labels
Change `text-sm font-medium` on the "RSVP Status:" label to `font-semibold text-foreground` -- matching "Table 7", "Seat 5", and "Dietary Requirements" labels above.

### 3. Replace Edit icon with text "Edit" in purple circle
Replace the `Edit3` icon button with a round purple button displaying the word "Edit" in white text. Remove the tooltip wrapper since the label is now explicit. Style: `w-10 h-10 rounded-full bg-primary text-white text-xs font-semibold`.

### 4. Clean up imports
Add `ClipboardCheck` to lucide-react imports. Remove `Edit3` since it will no longer be used.
