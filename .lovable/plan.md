
I will update the "Share with..." button in the Running Sheet dashboard to use a green border and text color, matching the "Download Entire Running Sheet PDF" button as requested. This will ensure visual consistency within the Export Controls section.

### Proposed Changes

#### Dashboard Components

**File:** `src/components/Dashboard/RunningSheet/RunningSheetPage.tsx`
- Update the styling for the "Share with..." button:
    - Change the border color from `border-primary` (purple) to `border-green-500`.
    - Change the text color from `text-primary` to `text-green-600`.
    - Change the hover background from `hover:bg-primary/10` to `hover:bg-green-50`.

This change will make both action buttons in the Export Controls section identical in style, using the established "success" green theme for the final output actions.

