## Replace Canva button with unified text+logo button (all viewports)

**File:** `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`

**Change (lines 517–535):** Remove the desktop-only image `<button>` (517–524) AND the entire mobile-only `<div className="hidden max-sm:flex justify-center mt-2">…</div>` block (526–535). Replace with one button rendered for all screen sizes, sitting inline with Choose File / Image Gallery:

```jsx
<button
  type="button"
  onClick={() => window.open('https://www.canva.com/', '_blank')}
  className="flex-1 max-sm:basis-[calc(50%-0.25rem)] max-sm:flex-none max-sm:min-w-0 h-9 rounded-full flex items-center justify-center gap-2 text-white text-sm font-medium cursor-pointer border-0 hover:opacity-90 transition-opacity"
  style={{ backgroundColor: '#7C3AED' }}
  aria-label="Design with Canva"
>
  <img src={canvaLogo} alt="" className="h-5 w-5 rounded-full object-cover" />
  Design with Canva
</button>
```

**Notes:**
- `canvaLogo` import (line 15) already exists — reused.
- `canvaButtonMobile` import (line 16) becomes unused after removal; will leave the import in place to keep scope minimal (no other code touched). If you want it removed too, say so.
- Choose File and Image Gallery buttons untouched.
- Mobile sizing matches sibling buttons via `basis-[calc(50%-0.25rem)]`, so on mobile Canva wraps to a second row at full-pair width alongside the existing wrap behavior.