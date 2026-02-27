
# Update Default Invitation Text Zones

## What's changing

The default text zones generated when creating a new **Invitation** template will be updated to match a new structure with 10 zones (up from 7), reordered and relabeled as follows:

| # | Label | Type | Default Text | Auto Field |
|---|-------|------|-------------|------------|
| 1 | Welcome Message | custom | "Join us to celebrate the wedding of..." | -- |
| 2 | Couple Names | auto | -- | couple_names |
| 3 | Ceremony Date | auto | -- | date |
| 4 | Ceremony Time | auto | -- | time |
| 5 | Ceremony Venue | auto | -- | venue |
| 6 | Reception Date | custom | "Reception Date" | -- |
| 7 | Reception Time | custom | "Reception Time" | -- |
| 8 | Reception Venue | custom | "Reception Venue" | -- |
| 9 | Dress Code | custom | "Cocktail Attire" | -- |
| 10 | RSVP Details | custom | "RSVP by ..." | -- |
| 11 | Guest Name | guest_name | "Guest Name" | -- |
| 12 | Notes | custom | "" | -- |

Note: Ceremony fields (Date, Time, Venue) use auto-fill from event data. Reception fields are custom text since the event data model has separate ceremony/reception fields that aren't currently wired as auto-fill options -- users can manually enter reception details, or admins can adjust these in the editor. The Y positions will be spaced evenly to distribute across the invitation.

## File changed

**`src/components/Admin/AdminInvitationTemplates.tsx`**

Replace the invitation default zones array (lines 52-60) with the new 12-zone list, each with appropriate y_percent spacing (~6-7% apart), font families, and sizes matching the existing design language.

This only affects **newly created** invitation templates. Existing templates are unchanged.
