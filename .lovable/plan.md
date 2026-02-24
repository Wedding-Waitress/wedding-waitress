

# Add Export Controls Box to Dietary Requirements Page

## What's Changing
The two green PDF download buttons ("Download single page PDF" and "Download all pages PDF") on the Dietary Requirements page will be wrapped in a styled "Export Controls" container, matching the design used in the Running Sheet and DJ-MC Questionnaire pages.

## Visual Result
- A purple-bordered rounded box will appear in the top-right area of the header card
- Bold "Export Controls" label followed by the instruction text: *"Download & share your dietary requirement guests with your venue / Kitchen."*
- The two existing green buttons will sit inside this box, unchanged in function

## Technical Details

### File: `src/components/Dashboard/QRCode/KitchenDietaryChart.tsx`
**Lines ~491-509** (the action buttons area)

Replace the current button container with a purple-bordered Export Controls box:

```tsx
<div className="border border-primary rounded-xl p-4 space-y-3">
  <p className="text-sm">
    <span className="font-bold">Export Controls</span>
    {' '}Download & share your dietary requirement guests with your venue / Kitchen.
  </p>
  <div className="flex items-center gap-2 flex-wrap">
    {/* existing two green buttons unchanged */}
  </div>
</div>
```

This matches the exact pattern used in the Running Sheet and DJ-MC Questionnaire export controls sections.
