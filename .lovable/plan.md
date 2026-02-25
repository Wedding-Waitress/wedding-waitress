
# Color-Code Status Labels on Toggle Switches

## What Changes
Update the four status labels next to the toggle switches (RSVP Invite, Welcome Video, Floor Plan, Menu) so the text color matches the toggle state: red when off, green when on.

## Technical Details

**File:** `src/components/Dashboard/QRCode/QRCodeMainCard.tsx`

Change `text-muted-foreground` to a conditional class at 4 locations (lines 760, 975, 1112, 1328):

From:
```tsx
<span className="text-xs text-muted-foreground whitespace-nowrap">
```

To:
```tsx
<span className={`text-xs whitespace-nowrap ${setting ? "text-green-600" : "text-red-500"}`}>
```

Where `setting` is the corresponding boolean for each module:
1. **Line 760** (RSVP Invite): `visibilitySettings?.show_rsvp_invite`
2. **Line 975** (Welcome Video): `visibilitySettings?.show_welcome_video`
3. **Line 1112** (Floor Plan): `visibilitySettings?.show_floor_plan`
4. **Line 1328** (Menu): `visibilitySettings?.show_menu`

### Files Modified
1. `src/components/Dashboard/QRCode/QRCodeMainCard.tsx` -- 4 lines updated
