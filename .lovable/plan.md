

# Running Sheet — Move "Share With" into Export Controls

## Changes

**File:** `src/components/Dashboard/RunningSheet/RunningSheetPage.tsx` (lines 168-185)

### What changes

1. **Remove** the standalone "Share with..." button (line 170-173)
2. **Update wording** inside Export Controls from "Download your running sheet and share it with your DJ-MC or wedding venue." to "Download your running sheet and share it with your DJ-MC or any of your vendors."
3. **Restructure Export Controls box** so the text description is on top, and below it are two tablet-style buttons side by side:
   - **Share with...** button — thick red border (`border-2 border-red-500 rounded-full`), same height as the PDF button
   - **Download entire running sheet PDF** button — thick green border (`border-2 border-green-500 rounded-full`), same height
4. Both buttons will have matching `px-4 py-2 text-sm font-medium` sizing for consistency

### Layout (inside the purple-bordered Export Controls box)

```text
+---------------------------------------------------------------+
| Export Controls                                                |
| Download your running sheet and share it with your DJ-MC or    |
| any of your vendors.                                           |
|                                                                |
| [ Share with... ]  [ Download entire running sheet PDF ]       |
|   (red border)          (green border)                         |
+---------------------------------------------------------------+
```

### Technical Detail

Lines 168-185 of `RunningSheetPage.tsx` will be restructured. The `<Button variant="outline">` for Share and `<Button variant="default">` for PDF will both become tablet-style buttons with thick colored borders, consistent font size, and equal height. The Export Controls div will switch from a horizontal `flex items-center` to a vertical layout (description text on top, button row below).

