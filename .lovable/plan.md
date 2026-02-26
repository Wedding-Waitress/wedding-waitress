
# Fix Mobile Display Issues on Public Add Guest Modal

## Problems (from screenshot)
1. **Top clipping**: "Add Extra Guest" title and close (X) button are cut off at the top on mobile
2. **White overlay**: A white gradient/overlay appears above the Cancel/Add Guest buttons
3. **Bottom bar**: An unwanted element appears below the action buttons

## Root Causes
- The `fullScreenOnMobile` mode applies `max-sm:pt-[env(safe-area-inset-top)]` on the DialogContent, but the header only has `pt-4` which may not be enough when combined with the browser chrome on mobile Safari
- The close button is positioned at `top-4` which gets clipped by the safe area
- The white overlay is likely caused by the scrollable area's overflow or a stacking issue with the action buttons
- The bottom bar may be from the browser's own UI or residual padding below the scroll container

## Changes (single file: `src/components/GuestLookup/PublicAddGuestModal.tsx`)

### 1. Add more top padding on mobile for header and close button
- Change the DialogHeader from `pt-4` to `pt-8 sm:pt-4` to push the title down on mobile
- Change the close button from `top-4` to `max-sm:top-8 top-4` so it clears the safe area on mobile

### 2. Remove the white overlay
- Add `overflow-hidden` or ensure the scrollable container doesn't produce a gradient fade. The issue is likely that the `overflow-y-auto` scroll container creates a visual artifact at the bottom. We'll ensure the action buttons sit cleanly inside the scroll area without any masking or overlay effect.

### 3. Remove the bottom bar
- Add `max-sm:pb-0` to the DialogContent to eliminate any extra bottom padding on mobile, and ensure nothing renders below the action buttons. Also add `pb-safe` or remove the safe-area bottom padding that may be creating the visible bar.
