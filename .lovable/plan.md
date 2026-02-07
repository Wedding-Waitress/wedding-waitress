

# Colorize RSVP Dropdown & Save Button in Guest Update Modal

## Summary
Update the "Update Your Information" modal in the Guest Lookup page to:
1. Add colored text to RSVP dropdown options (Pending = yellow/orange, Accept = green, Decline = red)
2. Change the "Save Changes" button from purple to green

## Technical Details

### File to Modify
`src/components/GuestLookup/GuestUpdateModal.tsx`

### Change 1: Colored RSVP Dropdown Options

**Current code (lines 221-225):**
```tsx
<SelectContent>
  <SelectItem value="Pending">Pending</SelectItem>
  <SelectItem value="Attending">Accept</SelectItem>
  <SelectItem value="Not Attending">Decline</SelectItem>
</SelectContent>
```

**Updated code:**
```tsx
<SelectContent>
  <SelectItem value="Pending" className="text-amber-500 font-medium">
    Pending
  </SelectItem>
  <SelectItem value="Attending" className="text-green-600 font-medium">
    Accept
  </SelectItem>
  <SelectItem value="Not Attending" className="text-red-500 font-medium">
    Decline
  </SelectItem>
</SelectContent>
```

**Colors match the existing Wedding Waitress design system:**
- `text-amber-500` → matches `--warning: 38 90% 55%` (yellow/orange for Pending)
- `text-green-600` → matches `--success: 142.1 70.5% 45.3%` (green for Accept/Attending)
- `text-red-500` → matches `--destructive: 0 84% 60%` (red for Decline/Not Attending)

### Change 2: Green Save Changes Button

**Current code (lines 326-329):**
```tsx
<Button onClick={handleSave} disabled={saving}>
  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save Changes
</Button>
```

**Updated code:**
```tsx
<Button 
  onClick={handleSave} 
  disabled={saving}
  className="bg-green-500 hover:bg-green-600 text-white"
>
  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save Changes
</Button>
```

This uses the same green color (`bg-green-500`) that's used throughout Wedding Waitress for save/confirm actions.

## Files Changed
| File | Change |
|------|--------|
| `src/components/GuestLookup/GuestUpdateModal.tsx` | Add colored classes to RSVP SelectItems + green styling to Save button |

