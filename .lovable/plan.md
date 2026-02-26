

# Auto-populate Party Members for Couple & Family in Public Add Guest Modal

## What changes

When a guest clicks "Add Guest" from the Live View:

### Couple selected
- The "Party Members" section automatically shows **2 members**: the referring guest (who clicked Add Guest) and the new guest being added (from the form fields).
- The **"+ Add a member to this party"** button is **hidden** since a couple is exactly 2 people.
- The "Add one more person to create a couple" helper text is **removed**.
- The party member count updates dynamically as the form is filled.

### Family selected
- The "Party Members" section automatically shows **1 member**: the referring guest.
- The **"+ Add a member to this party"** button remains visible so they can add more family members.
- The "Add two or more people to create a family" helper text is removed (replaced by the auto-populated referring guest).

### Individual selected
- No changes -- same behavior as today.

## Technical Details

### 1. Pass referring guest's name to the modal
- Add `addedByGuestName` prop to `PublicAddGuestModalProps` (first name + last name).
- In `GuestLookup.tsx`, find the guest object by `addGuestForId` and pass their name to the modal.

### 2. Display referring guest in party members (read-only)
- For **Couple**: Show a read-only list with the referring guest's name and the current form's first/last name (updated live). Hide the "+ Add a member" button entirely. Remove the couple validation that requires `partyMembers.length > 0` since the couple is implicit (referring guest + form guest).
- For **Family**: Show the referring guest as the first read-only entry in the members list. Keep the "+ Add a member" button visible. Adjust validation: family no longer needs 2 additional members since the referring guest counts as one.

### 3. Update save logic
- For **Couple**: Only save the form guest (the referring guest already exists in the DB). No extra party members needed.
- For **Family**: Save the form guest + any additional party members added via the form. The referring guest already exists.

### Files to modify
- `src/components/GuestLookup/PublicAddGuestModal.tsx` -- Add prop, update party members display logic, update validation
- `src/pages/GuestLookup.tsx` -- Pass referring guest's name to the modal
