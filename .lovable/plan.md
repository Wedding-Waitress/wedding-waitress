
# Add Status Labels Next to Toggle Switches

## What Changes
Add a small text label next to each toggle switch in the Guest Live View Configuration section. When the toggle is OFF (red), it shows "Not displayed on app." When ON (green), it shows "Displayed on app."

## Technical Details

**File:** `src/components/Dashboard/QRCode/QRCodeMainCard.tsx`

For each of the four modules (RSVP Invite, Welcome Video, Floor Plan, Menu), add a status label between the switch and the module info. The label will be placed to the left of the Switch, inside the `flex items-center justify-between` row.

### Changes to 4 locations:

**1. RSVP Invite (line 758-763):** Replace the closing `</div>` + `<Switch>` block with a right-side group containing the status text + switch.

**2. Welcome Video (line 968-973):** Same pattern.

**3. Floor Plan (line 1100-1105):** Same pattern.

**4. Menu (line 1311-1316):** Same pattern.

Each location changes from:
```
</div>
<Switch ... />
```
To:
```
</div>
<div className="flex items-center gap-2">
  <span className="text-xs text-muted-foreground whitespace-nowrap">
    {setting ? "Displayed on app" : "Not displayed on app"}
  </span>
  <Switch ... />
</div>
```

Where `setting` is the corresponding visibility boolean (`show_rsvp_invite`, `show_welcome_video`, `show_floor_plan`, `show_menu`).

### Files Modified
1. `src/components/Dashboard/QRCode/QRCodeMainCard.tsx` -- 4 locations updated
