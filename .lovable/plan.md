

## Styling Updates for Add Guest Modal - Party Members Section

Three targeted styling changes in `src/components/Dashboard/AddGuestModal.tsx`:

### 1. "Add a member to this party" Button - Green Background with White Text
**Line 1166**: Change from purple outline style to green filled button with white text.

Before: `className="rounded-full border-[#7248e6] text-[#7248e6] hover:bg-[#7248e6]/10"`
After: `className="rounded-full bg-green-500 hover:bg-green-600 text-white border-0"`

The plus icon and text will both appear in white on a green background, making it much more visible.

### 2. "Party Members (count)" Label - Green Text
**Line 1156**: Change the text and icon color from purple to green.

Before: `className="flex items-center gap-2 text-sm font-medium text-[#7248e6]"`
After: `className="flex items-center gap-2 text-sm font-medium text-green-500"`

### 3. Party Member Rows - Reduce Height
**Line 1245**: Reduce padding on each member row from `p-3` to `p-2` for a more compact list.

Before: `className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"`
After: `className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200"`

This makes rows shorter so lists of many members remain easy to scan without being bulky.

### Summary
- All changes are in one file: `AddGuestModal.tsx`
- Three lines changed, purely cosmetic
- No logic or functionality affected

