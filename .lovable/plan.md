
# Compact Guest Card Layout and Edit Button Styling

## Changes

### File: `src/components/GuestLookup/EnhancedGuestCard.tsx`

**1. Reduce spacing between sections**
- Change the main container from `space-y-4` (16px gaps) to `space-y-2.5` (10px gaps) on line 140
- Change the inner padding of the Table, Seat, and Dietary rows from `p-4` to `p-3` (lines 190, 209, 220)

**2. Restyle the Edit button as a purple circle with tooltip**
- Replace the ghost button with a round purple circle (`w-9 h-9 rounded-full bg-primary text-white hover:bg-primary/90`)
- Increase the Edit3 icon size from `w-4 h-4` to `w-5 h-5`
- Wrap the button in a `Tooltip` component (from `@/components/ui/tooltip`) with "Edit" as the tooltip text
- Import `Tooltip`, `TooltipContent`, `TooltipTrigger`, and `TooltipProvider` from the UI tooltip component

### Summary of visual outcome
- All rows (name, table, seat, dietary, RSVP, buttons) will be closer together with tighter vertical spacing
- The edit icon becomes a visible purple circle button in the top-right corner
- Hovering over the purple edit circle shows an "Edit" tooltip
