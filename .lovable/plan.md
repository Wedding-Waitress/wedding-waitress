

# Center Default Text Zones on Invitation Preview

## Problem
All text zones default to `x_percent: 10`, but the rendering formula calculates position as `left = x_percent - (width_percent / 2)`. With x=10 and width=80, this places text at -30% (off the left edge), causing zones to appear stuck on the left side of the invitation.

## Solution
Change the default `x_percent` in the `base()` helper function from `10` to `50`. This centers the text box horizontally: `left = 50 - 40 = 10%`, making it span from 10% to 90% -- perfectly centered.

## File to edit

**`src/components/Admin/AdminInvitationTemplates.tsx`** (line 23)

Change `x_percent: opts.x_percent ?? 10` to `x_percent: opts.x_percent ?? 50`

This single-line change affects all newly created templates. Existing templates are not impacted since their zone data is already saved in the database.

