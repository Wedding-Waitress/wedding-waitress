

## Plus-Guest Notification Banner in Guest List

### What This Does
Adds a flashing yellow notification pill with a red border above the guest list table (on the same row as Sort By / Import Export CSV, but left-aligned). It appears only when one or more guests have the `[NEW+]` marker, showing who added extra guests. It disappears once all alerts are acknowledged via Edit.

### File: `src/components/Dashboard/GuestListTable.tsx`

**1. Compute alert guests (memoized)**

Add a `useMemo` that filters guests with notes starting with `[NEW+]`, extracting the referring guest's name from each. This provides the data for the notification banner.

**2. Modify the control buttons row (line ~1734-1735)**

Change from `justify-end` to `justify-between` so we can place content on both sides:

- **Left side**: The new notification banner (only rendered when alertGuests array is non-empty)
- **Right side**: Existing Sort By + Import/Export CSV buttons (unchanged)

**3. Notification banner design**

```text
┌─────────────────────────────────────────────────────────────────┐
│  [Flashing yellow pill, red border]                  [Sort By] [Import/Export] │
│  "Susan Kenneth - Has added a +1 Guest.                                       │
│   Please acknowledge that in the below                                        │
│   flashing row by opening the EDIT button."                                   │
└─────────────────────────────────────────────────────────────────┘
```

Styling:
- Pill shape: `rounded-full`
- Border: `border-2 border-red-500`
- Background: same yellow as row flash (`rgba(250, 204, 21, 0.5)` / `bg-yellow-400`)
- Text: dark text, small font (`text-xs font-semibold`)
- Animation: reuse existing `animate-flash` class for pulsing on/off
- If multiple guests have alerts, show multiple lines or stack them

**4. Text format per alert**

For each guest with `[NEW+]` marker, parse the name from their notes (pattern: `{Name} has added: {AddedNames}`), then display:

> **{Guest Name}** - Has added a +1 Guest. Please acknowledge that in the below flashing row by opening the "EDIT" button.

**5. Auto-hide behavior**

Since the banner is computed from `[NEW+]` markers in guest data, it automatically disappears when the organiser clicks Edit on each flagged guest (which strips the marker). No additional logic needed.

### No other files or pages are changed.

