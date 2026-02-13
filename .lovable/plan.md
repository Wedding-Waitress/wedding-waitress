
## Update Step Indicator Badges (1st, 2nd, 3rd)

### Overview
Change the step indicator badges throughout the Guest List page from rectangular yellow tablets with red bold text to circular bright yellow badges with purple non-bold text.

### Target Locations
Three badges exist in `src/components/Dashboard/GuestListTable.tsx`:
1. **Line 1278** - "1st" badge (next to Choose Event)
2. **Line 1321** - "2nd" badge (above Type of Event box)
3. **Line 1365** - "3rd" badge (above Guest Relations box)

### CSS Changes
Each badge currently has this styling:
```
className="bg-yellow-400 text-red-600 font-extrabold text-lg px-3 py-1 rounded-lg inline-block"
```

Change to:
```
className="bg-[#f1fd32] text-[#7248e6] font-normal text-lg px-3 py-1 rounded-full inline-block"
```

### Key Modifications
- **Background color**: `bg-yellow-400` → `bg-[#f1fd32]` (bright yellow)
- **Text color**: `text-red-600` → `text-[#7248e6]` (Wedding Waitress purple)
- **Font weight**: `font-extrabold` → `font-normal` (remove bold)
- **Shape**: `rounded-lg` → `rounded-full` (circular)

### Files Modified
- `src/components/Dashboard/GuestListTable.tsx` (3 instances, lines 1278, 1321, 1365)

No other files require changes.
