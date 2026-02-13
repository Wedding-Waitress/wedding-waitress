
## Fix Create Event Modal: Date Picker Positioning + Footer Buttons

### Problem
1. **Date picker flipping**: In the Reception section, when navigating to future months (May, August, etc.), the calendar popover flips above the trigger button due to insufficient space at the bottom of the scrollable area.
2. **Cancel button**: Currently plain outline style -- needs red background to match other forms.
3. **Create Event button**: Currently uses gradient purple -- needs to use the common green color.

### Changes

**File: `src/components/Dashboard/EventCreateModal.tsx`**

1. **Add bottom padding to scrollable area** (line 229): Add `pb-40` (160px) to the scrollable container's className so there is always enough room below the last row for the date picker calendar to open downward without flipping.

2. **Cancel button** (lines 511-516): Change from `variant="outline"` to `variant="destructive"` so it has a red background, matching other modal forms.

3. **Create Event button** (lines 518-525): Change from `variant="gradient"` to a green background using `className="rounded-full bg-green-500 hover:bg-green-600 text-white"` and remove the gradient variant.

### Summary of Visual Changes
- Reception date pickers will always have room to open downward (no more flipping)
- Cancel button: red background (consistent with other forms)
- Create Event button: green background (consistent with other forms)
- No other changes anywhere else
