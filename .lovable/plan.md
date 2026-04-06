

## Apply Dark Gray (#1D1D1F) Text Color to Running Sheet Page

**What**: Change all text (headers, body, labels, inputs) on the Running Sheet page from the current near-black (#030712) to Apple's dark gray (#1D1D1F). This is a trial run — if you like it, we'll roll it out app-wide.

### Approach

Wrap the entire Running Sheet page in a CSS class that overrides text color for all elements within it. This avoids touching dozens of individual elements and automatically covers any future sections/rows added.

### Files to edit

**1. `src/index.css`** — Add a scoped utility class:
```css
.running-sheet-dark-gray,
.running-sheet-dark-gray * {
  color: #1D1D1F;
}
/* Preserve specific colors that should NOT change */
.running-sheet-dark-gray .text-primary { color: hsl(var(--primary)); }
.running-sheet-dark-gray .text-destructive { color: hsl(var(--destructive)); }
.running-sheet-dark-gray .text-muted-foreground { color: #6E6E73; }
```
The muted-foreground is also shifted to Apple's secondary gray (#6E6E73) for consistency.

**2. `src/components/Dashboard/RunningSheet/RunningSheetPage.tsx`** — Add `running-sheet-dark-gray` class to the root `<div>`:
```tsx
<div className="space-y-6 running-sheet-dark-gray">
```

**3. `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`** — No changes needed (inherits from parent).

**4. `src/components/Dashboard/RunningSheet/RunningSheetSection.tsx`** — No changes needed (inherits from parent).

### What changes visually
- All headings ("Running Sheet", section labels, event name) → #1D1D1F
- All body text (row content, column headers, input text) → #1D1D1F
- Muted/secondary text (descriptions, placeholders) → #6E6E73 (Apple's secondary gray)
- Purple accent colors (`text-primary`) and red highlights (`text-destructive`) remain unchanged
- No layout, spacing, or functionality changes

### What stays the same
- PDF export styling (uses its own rendering)
- Shared/vendor view styling
- All other pages in Wedding Waitress

