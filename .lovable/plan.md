

# Redesign Couple & Family Flows in Public Add Guest Modal

## Summary

When a guest selects **Couple** or **Family**, the main form fields (First Name through Notes + Cancel/Add Guest buttons) will be **hidden**. Instead, guests add people exclusively through the popup member form, which will be enhanced with RSVP Status, Dietary Requirements, and Notes fields.

## Changes

### 1. Hide main form for Couple and Family
The entire block from "First Name / Last Name" through "Notes" and the "Cancel / Add Guest" action buttons (lines 400-516) will only render when `guestType === 'individual'`. For Couple and Family, only the Party Members section with the green add button is shown.

### 2. Update the green add button labels
- **Couple**: Change button text to **"+ Add your partner to make you a couple"**
- **Family**: Keep as **"+ Add another member to this party"**

### 3. Enhance the PartyMember interface and member form
Add `rsvp`, `dietary`, and `notes` fields to the `PartyMember` type and `emptyMember()` defaults. Update the inline add-member form (lines 295-356) to include:
- RSVP Status dropdown (Pending orange, Accept green, Decline red) -- same styling as the main form
- Dietary Requirements dropdown (all 12 options)
- Notes textarea (rounded-3xl, purple border)

### 4. Style the member form action buttons
- **Cancel**: Red background, white text, rounded-full (`bg-red-600 text-white`)
- **Couple**: Green background, white text, label **"Add Partner"**
- **Family**: Green background, white text, label **"Add Member"**

### 5. Update save logic
- For **Couple/Family**: The "main guest" form is not used. Instead, save each party member directly via `add_guest_public` RPC. Remove the validation that checks `guest.first_name` etc. for couple/family types.
- For **Individual**: Save logic remains unchanged.
- Pass the member's `rsvp` and `dietary` values when saving (currently hardcoded to "Pending" and the member's dietary).

### 6. Update Party Members display
- For **Couple**: Show the referring guest + the added partner. The green add button is shown until a partner is added (max 1 member), then hidden.
- For **Family**: Show the referring guest + all added members. The green add button always visible.
- Remove the "New guest (fill form below)" live preview row for couples since the main form no longer exists.

## Technical Details

### File: `src/components/GuestLookup/PublicAddGuestModal.tsx`

**PartyMember interface** (line 36-42): Add `rsvp: string`, `dietary: string`, `notes: string`.

**emptyMember()** (line 44-50): Add defaults `rsvp: 'Pending'`, `dietary: 'None'`, `notes: ''`.

**Couple add button** (line 253-265): Show for couple (change condition), update label to "Add your partner to make you a couple". Disable when `partyMembers.length >= 1`.

**Remove couple live preview** (lines 279-290): Remove the "New guest (fill form below)" block since the main form won't exist for couples.

**Member form** (lines 295-356): Add RSVP Status select, Dietary Requirements select, and Notes textarea. Update Cancel button to red bg. Update Add Member button: green bg, label conditionally "Add Partner" (couple) or "Add Member" (family).

**Main form conditional** (lines 400-516): Wrap in `{guestType === 'individual' && (...)}` so it only renders for Individual.

**handleSave** (lines 102-171): For couple/family, skip main guest validation and saving. Instead iterate `partyMembers` and save each. For individual, keep existing logic.

