
# Redesign Public Add Guest Modal to Match Dashboard Style

## Overview
Rebuild the `PublicAddGuestModal` to visually and functionally match the dashboard's "Add New Guest" modal, with the exact fields, styling, and layout the user described.

## Visual & Field Layout (Top to Bottom)

1. **Title**: "Add Extra Guest" (styled like dashboard's purple "Add New Guest" title)
2. **Subtitle**: "Choose if they are an individual, your partner, or a family member."
3. **Guest Type Selector**: Identical pill selector from dashboard -- purple border container with pink (Individual), orange (Couple), blue (Family) active states
4. **Fields (Individual mode)**:
   - Row 1: First Name / Last Name (purple-bordered rounded-full inputs)
   - Row 2: Mobile / Email (purple-bordered rounded-full inputs)
   - Row 3: RSVP Status dropdown (Pending default, Accept, Decline) / Dietary Requirements dropdown (None, Kids Meal, Pescatarian, Vegetarian, Vegan, Seafood Free, Gluten Free, Dairy Free, Nut Free, Halal, Kosher, Vendor Meal)
   - Row 4: Notes textarea ("Add any additional notes about this guest...")
5. **Footer Buttons**: Red "Cancel" pill, Green "Add Guest" pill (matching dashboard button style)

For Couple and Family modes, the same party-member add flow (simplified -- inline fields per member) will be retained.

## Technical Details

### File Modified
- `src/components/GuestLookup/PublicAddGuestModal.tsx` -- Complete rewrite of UI and form fields

### Key Changes
- Add `email`, `notes`, `rsvp`, and `dietary` fields to `GuestEntry` interface
- Replace free-text dietary input with Select dropdown matching dashboard options
- Add RSVP Status Select dropdown (Pending/Accept/Decline)
- Add Notes textarea
- Copy the exact guest type selector styling from `AddGuestModal.tsx` (lines 922-969) -- purple border container, pink/orange/blue active pill colors
- Copy the exact input styling: `rounded-full border-2 border-primary` with focus states
- Copy the exact Select styling: `rounded-full border-2 border-primary h-9`
- Copy the exact Notes textarea styling: `rounded-3xl border-2 border-[#7248e6]`
- Copy the exact footer buttons: red Cancel pill, green Add Guest pill
- Update `handleSave` to pass `email`, `notes`, `rsvp`, and `dietary` values to the `add_guest_public` RPC
- RSVP defaults to "Pending" (user specified this) instead of current hardcoded "Attending"
- Modal title changes from "Add New Guest" to "Add Extra Guest"
- Subtitle changes to match user's exact wording

### Data Flow
- The `add_guest_public` RPC already accepts `_rsvp`, `_dietary`, `_email` parameters, so no backend changes needed
- Notes field: the RPC doesn't currently accept notes, so notes will be stored client-side only (or we skip it if the RPC doesn't support it). Will check and handle gracefully.

### What Stays the Same
- The Couple/Family multi-person flow logic
- The `add_guest_public` RPC call for security
- The `addedByGuestId` linking
- Real-time sync on guest addition
