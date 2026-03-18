

## Rebuild "Text Position" Tab with Interactive Drag-to-Position

### Current State
The Text Position tab has manual sliders and numeric inputs for X/Y offsets and rotation for both Guest Name and Table & Seat. The screenshot shows this should be replaced with a simple **Text Edit Mode** toggle, helper text, and a Reset button. Actual repositioning happens by dragging directly on the card preview.

### Changes

**1. `PlaceCardCustomizer.tsx` — Simplify Text Position tab (lines 439-690)**

Replace the entire tab content with:
- A purple-bordered container box (matching Design tab style)
- Row: pencil icon + "Text Edit Mode" label on left, Switch toggle on right
- Helper text below: "Enable Text Edit Mode above, then drag text elements directly on the card preview to reposition them."
- "Reset to Default" button at bottom

Add a new prop: `onTextEditModeChange: (enabled: boolean) => void` and `textEditMode: boolean` to pass edit mode state up to the parent.

Remove all local slider states (`localGuestNameOffsetX`, `localGuestNameOffsetY`, `localTableOffsetX`, `localTableOffsetY`, `inputGuestX`, etc.) and their syncing `useEffect`.

**2. `PlaceCardsPage.tsx` — Add text edit mode state**

- Add `const [textEditMode, setTextEditMode] = useState(false)` 
- Pass `textEditMode` and `onTextEditModeChange={setTextEditMode}` to `PlaceCardCustomizer`
- Pass `textEditMode` to `PlaceCardPreview`

**3. `PlaceCardPreview.tsx` — Add interactive text overlays**

- Accept new prop `textEditMode?: boolean`
- Import `InteractiveTextOverlay` from `@/components/ui/InteractiveTextOverlay`
- Add state: `selectedElement: 'guest-name' | 'table-seat' | null`
- When `textEditMode` is ON and rendering the **first card only**, wrap the Guest Name and Table & Seat elements in `InteractiveTextOverlay` components
- Each overlay gets: `containerRef` pointing to that card's div, `onMove` that converts pixel delta to mm offset and calls `onSettingsChange`, `onRotate`, `onReset`, resize handles, rotation handle with degree indicator
- Movement is relative to the individual card container (fixes the coordinate bug)
- When `textEditMode` is OFF, render text normally (no overlays, no interaction)
- Add new prop `onSettingsChange?: (settings: Partial<PlaceCardSettings>) => Promise<boolean>` for the preview to persist drag results
- Click outside any element clears selection

**4. Coordinate system fix (critical)**

The `InteractiveTextOverlay` uses percentage-based `onMove(dxPercent, dyPercent)`. In the preview, convert these percentages to mm offsets relative to the card dimensions (105mm × 49.5mm front half). Store as `guest_name_offset_x/y` and `table_offset_x/y` in mm — same fields already in the database.

### Files Modified
- `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx` — simplify Text Position tab
- `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx` — add textEditMode state, pass props
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — add InteractiveTextOverlay for drag/resize/rotate

