

## Apply Purple Pill-Border Heading Style to Full Seating Chart Customizer

### What
Apply the same purple pill-shaped heading style used in Place Cards and Floor Plan to three section headings in the Full Seating Chart customizer. This is a cosmetic-only change — no logic, layout, or functionality is modified.

### Changes — `src/components/Dashboard/FullSeatingChart/FullSeatingChartCustomizer.tsx`

**1. "Sort Order" heading (line 78)**
Change `<Label className="text-sm font-medium">Sort Order</Label>` to:
`<span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Sort Order</span>`

**2. "Display Options" heading (line 109)**
Change `<Label className="text-sm font-medium">Display Options</Label>` to:
`<span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Display Options</span>`

**3. "Typography" heading (line 143)**
Change `<Label className="text-sm font-medium">Typography</Label>` to:
`<span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Typography</span>`

Icons remain inside the parent `flex items-center gap-2` div — only the Label element changes to a styled span.

### Files modified
- `src/components/Dashboard/FullSeatingChart/FullSeatingChartCustomizer.tsx`

