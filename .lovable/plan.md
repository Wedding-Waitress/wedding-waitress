

## Gaps Between Requirements and Current Implementation

After reviewing the code, the interactive editor is **already implemented** with `InteractiveTextOverlay` wrapping both Guest Name and Table/Seat elements. Here's what's done vs missing:

| Requirement | Status |
|---|---|
| 1. Purple bounding box + resize handles | ✅ Done |
| 2. Resize text (drag corner handles) with font size tooltip | ✅ Done |
| 3. Drag to move with move handle | ✅ Done |
| 4. Rotation handle with degree tooltip | ✅ Done |
| 5. Top toolbar with Reset/Duplicate/Delete | ⚠️ Only Reset exists |
| 6. Edit Mode toggle | ✅ Done |
| 7. Global sync (all cards) | ✅ Done |
| 8. Keep existing Text Position controls | ✅ Done |
| 9. Smooth UX, single selection | ✅ Done |
| 10. Data sync (visual ↔ sliders) | ✅ Done |

### What's Missing

**Only the toolbar is incomplete** — it currently shows only a Reset button. The user wants 3 buttons matching the Invitations editor (see uploaded screenshot with red arrows):

1. **Reset** (RotateCcw icon) — already works
2. **Duplicate** (CopyPlus icon) — not wired up
3. **Delete** (Trash2 icon) — not wired up

For Place Cards, Guest Name and Table/Seat are **fixed structural elements** — duplicating or deleting them doesn't make functional sense (unlike Invitations where users add custom text zones). 

### Proposed Approach

Add `onDuplicate` and `onDelete` callbacks to both `InteractiveTextOverlay` instances in `PlaceCardPreview.tsx`:

- **Duplicate**: Creates a duplicate text element... but Place Cards don't support arbitrary custom text zones. This would require a significant architectural change (adding a `custom_text_zones` array to `place_card_settings`).
- **Delete**: Same issue — hiding a fixed element needs new boolean fields (`guest_name_visible`, `table_seat_visible`).

### Recommendation

Given that the core interactive editing (select, move, resize, rotate, reset, edit mode, sync) is **fully working**, the Duplicate and Delete buttons require substantial new data architecture to function on Place Cards. Two options:

**Option A — Show all 3 buttons visually** but make Duplicate/Delete no-ops with a toast message ("Not available for fixed elements"). Quick cosmetic match to Invitations.

**Option B — Skip Duplicate/Delete for now** since Place Cards only have 2 fixed text elements. Focus effort elsewhere.

**Option C — Full implementation** with new DB columns for visibility + custom text zones array. Significant scope.

