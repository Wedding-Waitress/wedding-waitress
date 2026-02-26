

# Fix Close Button, Required Fields & RSVP Colors

## Changes (all in `src/components/GuestLookup/PublicAddGuestModal.tsx`)

### 1. Close Button -- White background with thick purple border and purple X
Replace the current purple-filled close button with:
- White background (`bg-white`)
- Thick purple border (`border-2 border-primary`)
- Purple X icon (`text-primary`)
- Keep circular shape (`rounded-full aspect-square`)

### 2. Add required asterisks to Last Name, Mobile, Email, and RSVP Status
Add red asterisk `*` to labels for:
- Last Name (line 245)
- Mobile (line 258)
- Email (line 267)
- RSVP Status (line 280)

Update validation in `handleSave` (line 100-104) to also check `last_name`, `mobile`, `email` are filled, and show appropriate error messages.

### 3. Color-code RSVP dropdown items
Style the three RSVP `SelectItem` entries with semantic colors:
- **Pending** -- orange text (`text-orange-500`, matching the Couple pill color `#FF5F1F`)
- **Accept** -- green text (`text-green-600`)
- **Decline** -- red text (`text-red-600`)

Also color the `SelectValue` display text based on the current selection by conditionally applying a color class to the `SelectTrigger`.

## Technical Details

**Line 171**: Change close button classes from `bg-primary border-2 border-primary` to `bg-white border-2 border-primary`, and X icon from `text-white` to `text-primary`.

**Lines 245, 258, 267, 280**: Add ` *` with `<span className="text-destructive">*</span>` to each label.

**Lines 100-104**: Expand validation to check `last_name.trim()`, `mobile.trim()`, `email.trim()` are non-empty and show toast if missing.

**Lines 282-289**: Add color classes to SelectTrigger based on current value, and to each SelectItem:
- `<SelectItem value="Pending" className="text-[#FF5F1F]">Pending</SelectItem>`
- `<SelectItem value="Attending" className="text-green-600">Accept</SelectItem>`
- `<SelectItem value="Not Attending" className="text-red-600">Decline</SelectItem>`

Apply conditional color to the trigger text so the selected value shows in its corresponding color.

