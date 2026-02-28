

# Move Export Controls to Same Row as Dropdowns

## What's Changing

The Export Controls section currently sits on its own row below the Choose Event and Table dropdowns. It will be moved up to sit on the **same line** as the dropdowns, pushed to the far right. The layout inside the Export Controls box will change to a **two-line stack**:

- **Line 1:** "Export Controls" title followed by "Download your place cards as PDF ready for printing."
- **Line 2:** The two buttons side by side

## Technical Detail

**File:** `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx`

1. **Remove** the separate Export Controls `div` block (lines 376-404) that currently renders below the dropdowns.

2. **Merge** the Export Controls into the existing dropdowns row (line 315). The dropdowns row changes from a simple flex to a `flex justify-between` layout:
   - Left side: Choose Event + Table dropdowns (unchanged)
   - Right side: Export Controls box with stacked layout (title/description on top, buttons below)

3. The Export Controls inner layout changes from a single-row `flex items-center` to a vertical stack:
   - Top: text with "Export Controls" and description "Download your place cards as PDF ready for printing."
   - Bottom: the two green-bordered download buttons

Nothing else changes -- no styling, no functionality, no other files.

