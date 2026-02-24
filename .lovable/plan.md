

# Move Download PDF Button to Right Side of Export Controls

## Change
In the Export Controls box on the Floor Plan page, move the green "Download PDF" button to the right-hand side of the same line as the text, instead of below it.

## Technical Detail

### File: `src/components/Dashboard/FloorPlan/FloorPlanPage.tsx` (~lines 176-193)

Change the Export Controls inner layout from a vertical `space-y-3` stack to a horizontal `flex justify-between items-center` row, placing the text on the left and the Download PDF button on the right, all on one line.

