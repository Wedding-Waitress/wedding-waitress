

# Move Party Members Section Below Guest Type

## Changes (all in `src/components/GuestLookup/PublicAddGuestModal.tsx`)

### 1. Move the Party Members section from below Dietary to directly below Guest Type
Currently the "Party Members" block (lines 324-481) sits after the RSVP/Dietary row. It will be relocated to appear immediately after the Guest Type selector (after line 238), before the First Name / Last Name fields.

### 2. Change "fill form above" to "fill form below"
Since the form fields will now appear **below** the party members section, update the fallback text on line 368 from `'New guest (fill form above)'` to `'New guest (fill form below)'`.

### 3. Change "+ Add a member to this party" to "+ Add another member to this party"
Update the button text on line 346 from `"Add a member to this party"` to `"Add another member to this party"`.

## Technical Details

### File: `src/components/GuestLookup/PublicAddGuestModal.tsx`

**Step 1** -- Cut the entire Party Members block (lines 323-481) from its current location.

**Step 2** -- Paste it immediately after the Guest Type selector closing `</div>` (after line 238), before the First Name / Last Name grid.

**Step 3** -- On the "New guest" fallback text, change `'New guest (fill form above)'` to `'New guest (fill form below)'`.

**Step 4** -- On the green button, change label from `"Add a member to this party"` to `"Add another member to this party"`.

The rest of the logic (couple hides the add button, family shows referring guest + add button, individual hides entire section) remains unchanged.

