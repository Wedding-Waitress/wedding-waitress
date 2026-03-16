

## Plan: Move Edit with Canva banner onto the same row as Choose File and Image Gallery

### Summary
Move the clickable Canva banner image from its own row below the buttons into the same flex row as Choose File and Image Gallery, so all three sit side by side on one line.

### File Changes

#### 1. `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`
- **Move lines 428-433** (the `<img>` tag) inside the `</div>` that closes at line 427, placing it after the Image Gallery button (before the closing `</div>`).
- Remove `mt-2` from the image class since it will now be inline with the buttons.
- The flex container already has `gap-2`, so the banner will sit naturally next to the buttons.

#### 2. `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`
- **Move lines 706-711** (the `<img>` tag) inside the `</div>` that closes at line 703, placing it after the Image Gallery button.
- Same class adjustment: remove `mt-2`.

### Result
All three elements — Choose File (green), Image Gallery (purple), Edit with Canva (banner) — appear on a single row in both pages. No other changes.

