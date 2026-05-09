## Add "Guest Live View Protection" Information Banner

**Page:** Guest List (`src/components/Dashboard/GuestListTable.tsx`)

**Position:** Insert directly between the `SmartSmsCreditStatus` block (line 1786) and the Step 1–5 grid (line 1789) — i.e. above the 5 setup cards and below the "0 SMS Credits Remaining" section.

### Banner design

- Full-width card matching existing premium style: `bg-card border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.10)]`, padding `p-4` (slightly shorter than the SMS credits card which uses `p-5`+).
- Layout: horizontal flex, responsive — icon + text on left, CTA button on right. On mobile (`max-md:`) stacks vertically with button full-width.
- Icon: `ShieldCheck` from lucide-react in a soft circular badge (`bg-primary/10 text-primary rounded-full p-2.5`).
- Heading: `Guest Live View Protection` — `text-base font-bold text-primary`.
- Body: two short lines, `text-sm text-muted-foreground leading-relaxed`:
  1. "7 days before your event, RSVP responses, guest edits, and +1 requests are automatically hidden from the Live View app for security and event-day stability."
  2. "You still have full control over what guests can view during the final week through your Guest Live View Configuration settings."
- Button: `Configure Guest Live View →` — outline variant, with the universal `lv-premium-shade` class (per Core memory rule).

### Button action

Navigate to QR Code Seating Chart tab and scroll to the Guest Live View Configuration section:

```ts
const url = new URL(window.location.href);
url.searchParams.set('tab', 'qr-code');
url.hash = 'guest-live-view-configuration';
window.history.pushState({}, '', url);
window.dispatchEvent(new PopStateEvent('popstate'));
// then on qr-code page, scrollIntoView the anchor element
```

I will:
1. Add a stable `id="guest-live-view-configuration"` anchor on the existing Guest Live View Configuration container inside `KioskLiveViewConfig.tsx` (verify exact wrapper) so the scroll target exists.
2. In the new banner's onClick, set the tab via URL params (matching existing `setActiveTab` pattern in `Dashboard.tsx`) and scroll to that anchor after a short timeout for mount.

### Out of scope

- No changes to Step 1–5 cards, layout, RSVP logic, QR/seating logic, or business logic.
- No spacing changes to surrounding elements (banner uses `mb-4` to mirror the SMS credits card's bottom spacing).

### Files modified

- `src/components/Dashboard/GuestListTable.tsx` — insert banner JSX (~30 lines).
- `src/components/Dashboard/Kiosk/KioskLiveViewConfig.tsx` — add `id` anchor on the Guest Live View Configuration section wrapper (1-line change).
