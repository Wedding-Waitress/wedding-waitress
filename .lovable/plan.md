

## Place 2nd and 3rd Boxes Side by Side

### Change

**File: `src/components/Dashboard/GuestListTable.tsx`** (line 1316)

Change the settings boxes container from vertical stack to horizontal row:

```
<div className="flex flex-col gap-4">
```
To:
```
<div className="flex flex-col md:flex-row gap-4">
```

This puts the "Type of Event" (2nd) and "Guest Relations" (3rd) boxes side by side on medium+ screens, each taking equal width. On smaller screens they will still stack vertically.

No other changes needed -- just this one class addition.

