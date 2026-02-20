
# Change "Activate" and "Deactivate" Text Colours

## What Needs Changing

In `src/components/Dashboard/GuestListTable.tsx` at lines 1482 and 1489, both labels currently use `text-black`. The request is:

- **"Activate"** → permanently **green** text (`text-green-500`)
- **"Deactivate"** → permanently **red** text (`text-red-500`, matching the red toggle background)

## Current Code (lines 1481–1490)

```tsx
<div className="flex items-center justify-center gap-3 mb-3">
  <span className="text-sm font-bold text-black">Activate</span>
  <Switch ... />
  <span className="text-sm font-bold text-black">Deactivate</span>
</div>
```

## Updated Code

```tsx
<div className="flex items-center justify-center gap-3 mb-3">
  <span className="text-sm font-bold text-green-500">Activate</span>
  <Switch ... />
  <span className="text-sm font-bold text-red-500">Deactivate</span>
</div>
```

## Only 1 File Changed

- `src/components/Dashboard/GuestListTable.tsx` — two word colour changes only. No logic, no layout, no other changes.
