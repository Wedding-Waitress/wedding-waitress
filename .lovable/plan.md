## DJ & MC Questionnaire — Tablet Layout Fix

The current page renders awkwardly at tablet widths (768–1023px): the section rows squeeze every column, inputs collapse, and the top "Export Controls" panel overflows the event-selector card. Desktop (≥1024px) and mobile must be left untouched.

### Heads-up: locked file approval needed

`DJMCQuestionnairePage.tsx` and `DJMCQuestionnaireSection.tsx` carry the "PRODUCTION-READY — LOCKED FOR PRODUCTION" header (last locked 2026-02-19). Per project rules I must confirm before editing locked files. Approving this plan = approval to touch only the tablet-specific (`md:`/`lg:`) breakpoints in those two files. No desktop, mobile, or behavior changes.

### Scope (tablet only, 768–1023px)

Files edited:
- `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnairePage.tsx`
- `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection.tsx`

No other files touched. Sidebar already hides via `useIsMobile` (<1024px) → hamburger overlay already in place; nothing to change there.

### Changes

1. **Page header card (`DJMCQuestionnairePage.tsx`, ~line 142–185)**
   - Change the `flex items-center justify-between gap-4 flex-wrap` row so the Export Controls block wraps cleanly under the Event selector on tablet (`max-lg:w-full max-lg:mt-3`) instead of being squeezed beside it.
   - Make the inner Export Controls panel `max-lg:w-full`, with the two action buttons wrapping to two equal-width pills on tablet.
   - Keep desktop (`lg:`) layout identical (selector left, controls right).

2. **Wedding/event details strip (~line 211–256)**
   - No structural change; just allow the Ceremony / Reception two-column flex to wrap to a single stacked column on tablet (already uses `flex-wrap`, confirm `min-w-[280px]` doesn't force overflow at 768px → drop to `max-lg:min-w-0 max-lg:w-full`).

3. **Section cards — horizontal scroll for the row table (`DJMCQuestionnaireSection.tsx`, ~line 337–498)**
   - Wrap the column header (`<div className="flex items-center gap-2 px-1 py-2 …">`) **and** the `DndContext`/rows region in a single shared scroll container:
     ```
     <div className="max-lg:overflow-x-auto">
       <div className="max-lg:min-w-[900px]">
         {column header}
         {DndContext / rows}
         {Add Row button}
       </div>
     </div>
     ```
   - This preserves desktop widths exactly (no `max-lg:` styles affect ≥1024px) while on tablet the existing flex/basis columns keep their proportions inside a 900px scroll canvas — so every drag handle, mic icon, YouTube link, comment, download, and Add Row stays full-size and aligned.
   - Add `max-lg:overflow-x-hidden` on the parent `<Card>` so only the inner row area scrolls (header/title/badges stay fixed and readable).

4. **Card spacing**
   - The page already wraps sections in `space-y-4`; bump to `max-lg:space-y-5` so cards breathe on tablet. No desktop change.

5. **Section header (title + badges + icons row, line 209–316)**
   - Allow the right-side icon cluster (`MessageSquare`, `MoreVertical`, `Download`) to stay inline; allow the left title group to wrap badges below the title on tablet via `max-lg:flex-wrap` on the inner `flex items-center gap-3` div. Prevents the "Total Song Count" / "Total Speakers" badges from pushing icons off-card.

### Out of scope (explicitly NOT changing)

- Desktop layout (≥1024px) — pixel-identical.
- Mobile (<768px) — untouched this round per request.
- Any logic, data, PDF export, share modal, or drag-and-drop behavior.
- Sidebar / hamburger (already correct via `useIsMobile`).
- Any other page or feature.

### Verification

After implementation, view at 820×1180 (iPad) and 768×1024:
- Sidebar hidden, hamburger top-right works.
- Top card: selector + export controls stack cleanly, no overflow.
- Each section card is full-width with horizontal scroll inside; all icons visible at full size.
- Switch to ≥1024px → layout matches current desktop screenshot exactly.
