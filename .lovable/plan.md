

## RSVP Activation Modal - Styling Updates

Three simple changes to `src/components/Dashboard/RsvpActivationModal.tsx`:

### 1. Title Update
Change "Activate RSVP Invites" to **"Activate and Send RSVP Invites"** (line 77).

### 2. Cancel Button - Red Background, White Text
Change the Cancel button from the current outline style to a red background with white text, matching the destructive/cancel pattern used throughout Wedding Waitress (line 112).

Before: `variant="outline"` with default styling
After: `bg-red-500 hover:bg-red-600 text-white`

### 3. Pay Now Button - Green Background
Change the Pay Now button from purple (`bg-primary`) to the brand green used across all primary action buttons (line 118).

Before: `bg-primary hover:bg-primary/90 text-primary-foreground`
After: `bg-green-500 hover:bg-green-600 text-white`

### Summary
All three changes are in a single file, purely cosmetic, and match the existing Wedding Waitress button conventions (red Cancel, green action).
