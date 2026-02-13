
## Revert Button Size to Match Badge Size

**File:** `src/components/Dashboard/EventsTable.tsx` (lines 265-268)

### Issue
The "Create Event" button was recently reduced in size (to `xs`) to match a different design. However, the user wants the button text and icon to be the same size as the "1 Event Created" badge text, which uses `text-sm`.

### Current Code (lines 265-268)
```jsx
<Button variant="default" size="xs" className="rounded-full flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white touch-target" onClick={() => setCreateModal(true)}>
  <Plus className="w-3 h-3" />
  {isMobile ? "Create" : "Create Event"}
</Button>
```

### Proposed Change
Change the button back to `size="sm"` to match the badge sizing, and revert the icon and gap spacing:
- Change `size="xs"` → `size="sm"` (this gives text-sm instead of text-xs)
- Change icon from `w-3 h-3` → `w-4 h-4` (match badge icon size)
- Change gap from `gap-1.5` → `gap-2` (restore original spacing)

### New Code
```jsx
<Button variant="default" size="sm" className="rounded-full flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white touch-target" onClick={() => setCreateModal(true)}>
  <Plus className="w-4 h-4" />
  {isMobile ? "Create" : "Create Event"}
</Button>
```

### Result
The "Create Event" button text will now be the same size as the "1 Event Created" badge text, making them visually consistent.

### Files Modified
- `src/components/Dashboard/EventsTable.tsx` (lines 265-268 only)
