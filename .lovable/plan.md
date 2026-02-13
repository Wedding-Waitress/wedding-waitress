

## Stack "Type of Event" and "Guest Relations" Boxes Vertically

### Overview
Move the two settings boxes from a side-by-side layout to a vertical stack, so the page flows top-to-bottom: Choose Event -> Type of Event -> Guest Relations.

### Change

**File: `src/components/Dashboard/GuestListTable.tsx`** (line 1315)

Change the flex container from:
```
<div className="flex flex-col md:flex-row gap-4">
```
To:
```
<div className="flex flex-col gap-4">
```

This removes the `md:flex-row` so both boxes always stack vertically, appearing below the "Choose Event" row in order: 2nd (Type of Event), then 3rd (Guest Relations).

No other files are changed.

