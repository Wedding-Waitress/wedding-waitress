

# Add Hover Tooltips to Share Modal Action Icons

## Problem
In the "Share Running Sheet" modal's Manage tab, the three action icons (Copy Link, Open Link, Delete) have no hover text, so users don't know what each button does.

## Solution
Add `title` attributes to each of the three icon buttons in `RunningSheetShareModal.tsx`:

- **Copy icon** (first): `"Copy Link"`
- **External Link icon** (middle): `"Open Link"`
- **Trash icon** (last): `"Delete Link"`

## File Changed

| File | Change |
|------|--------|
| `src/components/Dashboard/RunningSheet/RunningSheetShareModal.tsx` | Add `title` prop to each of the 3 action buttons in the Manage tab |

## Technical Details

- Uses the native HTML `title` attribute for hover text, consistent with other action buttons in the app (e.g., Running Sheet row actions)
- No new dependencies or component changes needed
- The file is locked for production but the owner is explicitly requesting this change

