

## Update Step Indicator Badges to Green Circles with White Text

### What's Changing
The "1st", "2nd", and "3rd" step badges on the Guest List page need to be updated to match the reference screenshot: a green circular badge with white text.

### Target Locations
Three badges in `src/components/Dashboard/GuestListTable.tsx`:
1. **Line 1278** - "1st" badge
2. **Line 1321** - "2nd" badge
3. **Line 1365** - "3rd" badge

### CSS Changes
Each badge currently has:
```
className="bg-[#f1fd32] text-[#7248e6] font-normal text-lg px-3 py-1 rounded-full inline-block"
```

Change to:
```
className="bg-green-500 text-white font-normal text-lg w-8 h-8 rounded-full inline-flex items-center justify-center"
```

### Key Modifications
- **Background**: `bg-[#f1fd32]` (yellow) -> `bg-green-500` (green)
- **Text color**: `text-[#7248e6]` (purple) -> `text-white`
- **Shape**: Replace `px-3 py-1` padding with fixed `w-8 h-8` dimensions + `inline-flex items-center justify-center` to make a true circle
- **No other changes** to any other element on the page

### Files Modified
- `src/components/Dashboard/GuestListTable.tsx` (3 instances)

