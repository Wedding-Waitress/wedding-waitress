

## Lock Place Card Text Positioning Logic

The user wants to lock the current text positioning, boundary detection, and dragging behavior for guest name and table/seat lines in PlaceCardPreview.tsx to prevent accidental regressions during future work.

### Action

Update the project memory to record this lock, matching the existing lock pattern in `stationery-interactive-system-lock`. No code changes needed — the lock is enforced via AI memory/instructions.

### What gets locked

In `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`:

1. **Free dragging logic** — `handleInteractiveMove`, `handleLiveGuestMove`, `handleLiveTableMove` with no clamping
2. **`buildAbsoluteStyle`** — centered positioning with no `overflow: hidden`, no width constraints, no ellipsis
3. **Overflow detection `useEffect`** — 2.5mm inner safe margin validation across all cards using `getBoundingClientRect()` with temporary `overflow: visible` trick
4. **Master-slave sync** for both guest name and table/seat positioning
5. **Front-half container** `overflow: 'visible'` setting
6. **Red/green border validation** behavior and messaging

### What is NOT locked

- Back-half layout, decorative images, print/export
- Design tab styling controls (font, size, color, bold/italic/underline)
- Other elements on the place cards page outside of guest name and table/seat text positioning
- Any new features yet to be built

