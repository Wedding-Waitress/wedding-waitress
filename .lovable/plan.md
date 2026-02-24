
# Remove "Share with..." Button from Full Seating Chart Export Controls

## Change
Remove the "Share with..." button from the Export Controls section in the Full Seating Chart page, keeping only the two PDF download buttons.

## File to Modify
**`src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx`**

1. Remove the "Share with..." button (lines 275-281)
2. Update the description text from "Download the Full Seating Chart or share with your vendors." to "Download the Full Seating Chart and share it with your vendors." (to match the standard export controls wording)
3. Remove the `Share2` icon import and `shareModalOpen` state/modal if they become unused

The two remaining buttons ("Download single page PDF" and "Download all pages PDF") stay as-is.
