

## Move Settings Boxes Below "Choose Event" Row

### What's Changing
The "Type of Event" and "Guest Relations" boxes are currently positioned inside the header layout div that uses `xl:flex-row`, which places them to the right of the title/event selector on large screens. You want them moved below the "Choose Event" row, stacked vertically with gaps, so the flow is:

1. Guest List title + description
2. "1st" badge + Choose Event dropdown + Search
3. (gap)
4. "2nd" badge + Type of Event box (full width)
5. (gap)
6. "3rd" badge + Guest Relations box (full width)

### Technical Change

**File: `src/components/Dashboard/GuestListTable.tsx`**

1. **Close the left-side `div` and the `xl:flex-row` container** right after the search field (after line 1311), before the settings boxes begin.

2. **Move the settings boxes block** (lines 1313-1460 approximately) to sit **after** the closing of the `xl:flex-row` div, but still inside the header `px-3 sm:px-6 py-4` wrapper. This places them as full-width stacked blocks below the Choose Event row.

Specifically:
- End the `flex-shrink-0` div (line 1311 `</div>`) and the `xl:flex-row` div right after it
- Place the two settings boxes as a new `flex flex-col gap-4` block below that closed div
- Both boxes will now span the full width of the card

No content inside the boxes changes -- only their position in the DOM tree moves.
