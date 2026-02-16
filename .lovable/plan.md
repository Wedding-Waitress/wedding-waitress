
## Add Guest Modal - Party Members Styling Tweaks

Three small changes in `src/components/Dashboard/AddGuestModal.tsx`:

### 1. Add Green Border Around "Party Members (count)" Label
Wrap the label area with a visible green border to create a clear "tablet" effect, without filling the background.

**Line 1156**: Change from plain green text to include a bordered container.

Before: `<div className="flex items-center gap-2 text-sm font-medium text-green-500">`
After: `<div className="flex items-center gap-2 text-sm font-medium text-green-500 border border-green-500 rounded-full px-3 py-1">`

This adds a rounded pill border in green around the icon and text, keeping the background transparent.

### 2. Reduce Party Member Row Height Further
Make the member rows even more compact by reducing padding from `p-2` to `py-1 px-2`.

**Line 1245**: Update padding on member rows.

Before: `className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200"`
After: `className="flex items-center justify-between bg-white py-1 px-2 rounded-lg border border-gray-200"`

### Summary
- Single file, two lines changed
- Green bordered pill around "Party Members" label (no fill)
- Thinner member rows for better readability with many members
- No other changes
