

# Fix Text Zone Centering and Implement 12-Zone Layout

## Problem

Two issues need fixing:

1. **Text zones appear off-screen on existing templates**: The `x_percent` default was changed to 50 in the `base()` helper, but this only affects **newly created** templates. The template you're editing was created before the fix, so its zones are saved in the database with `x_percent: 10`. With the rendering formula `left = x_percent - width/2 = 10 - 40 = -30%`, text boxes render mostly off the left edge of the invitation.

2. **The 12-zone layout was not yet applied**: The default invitation zones (lines 52-60) still show the old 7-zone list instead of the approved 12-zone structure.

## Solution

### 1. Update default invitation zones to the approved 12-zone layout

**File: `src/components/Admin/AdminInvitationTemplates.tsx`** (lines 52-60)

Replace the 7-zone array with the 12 zones, all using `x_percent: 50` (centered), evenly spaced vertically:

| # | ID | Label | Type | Auto Field | y_percent |
|---|----|-------|------|-----------|-----------|
| 1 | welcome | Welcome Message | custom | -- | 10 |
| 2 | couple_names | Couple Names | auto | couple_names | 17 |
| 3 | ceremony_date | Ceremony Date | auto | date | 24 |
| 4 | ceremony_time | Ceremony Time | auto | time | 30 |
| 5 | ceremony_venue | Ceremony Venue | auto | venue | 36 |
| 6 | reception_date | Reception Date | custom | -- | 43 |
| 7 | reception_time | Reception Time | custom | -- | 49 |
| 8 | reception_venue | Reception Venue | custom | -- | 55 |
| 9 | dress_code | Dress Code | custom | -- | 62 |
| 10 | rsvp | RSVP Details | custom | -- | 69 |
| 11 | guest_name | Guest Name | guest_name | -- | 76 |
| 12 | notes | Notes | custom | -- | 83 |

All zones will use `x_percent: 50` and `width_percent: 80`, which renders as `left: 10%` to `right: 90%` -- perfectly centered.

### 2. Existing templates

For existing templates already saved in the database, the admin will need to either:
- Delete and recreate the template (which will pick up the new defaults), or
- Manually adjust each zone's X position to 50% using the editor sliders.

No database migration is needed since this is admin-managed content.

## Files changed

- **`src/components/Admin/AdminInvitationTemplates.tsx`** -- Replace invitation default zones array (lines 52-60) with the 12-zone layout.
