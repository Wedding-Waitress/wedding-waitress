

## Three Changes to My Events Page and Create Event Modal

### Change 1: Reduce the "Create Event" button size in EventsTable.tsx

**File:** `src/components/Dashboard/EventsTable.tsx` (line 265)

The green "Create Event" button is slightly too large. Change the size from `sm` to `xs` to make it more consistent with other elements. Also reduce padding slightly.

Current:
```jsx
<Button variant="default" size={isMobile ? "sm" : "sm"} className="rounded-full flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white touch-target" ...>
```

New:
```jsx
<Button variant="default" size="xs" className="rounded-full flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white touch-target" ...>
```

### Change 2: Restyle Location Details popover Cancel/Save buttons

**File:** `src/components/Dashboard/LocationDetailsPopover.tsx` (lines 116-123)

Change the Cancel and Save buttons in the Location Details popover (used by both Ceremony and Reception sections) to:
- **Cancel:** Red background with white text (`bg-red-500 hover:bg-red-600 text-white`)
- **Save:** Green background with white text (`bg-green-500 hover:bg-green-600 text-white`)

Current:
```jsx
<Button variant="outline" size="sm" className="rounded-full" onClick={handleCancel}>Cancel</Button>
<Button variant="gradient" size="sm" className="rounded-full" onClick={handleSave}>Save</Button>
```

New:
```jsx
<Button size="sm" className="rounded-full bg-red-500 hover:bg-red-600 text-white" onClick={handleCancel}>Cancel</Button>
<Button size="sm" className="rounded-full bg-green-500 hover:bg-green-600 text-white" onClick={handleSave}>Save</Button>
```

### Change 3: Restyle Create Event modal footer Cancel/Create Event buttons

**File:** `src/components/Dashboard/EventCreateModal.tsx` (lines 551-565)

The Cancel button already uses `variant="destructive"` (red). The Create Event button already uses green. These look correct from the screenshot. However, to ensure full consistency and matching tablet-style sizing, both buttons will use explicit color classes and matching size.

Current:
```jsx
<Button variant="destructive" onClick={handleClose} className="rounded-full">Cancel</Button>
<Button onClick={handleCreate} disabled={...} className="rounded-full bg-green-500 hover:bg-green-600 text-white">Create Event</Button>
```

These already match the requested style (red Cancel, green Create Event), so no change needed here.

### Files Modified
- `src/components/Dashboard/EventsTable.tsx` -- reduce Create Event button size
- `src/components/Dashboard/LocationDetailsPopover.tsx` -- Cancel = red bg/white text, Save = green bg/white text
