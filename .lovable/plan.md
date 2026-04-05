

## Plan: Guest Live View Page Updates

### Changes Overview

Four targeted modifications to `src/pages/GuestLookup.tsx`:

---

### 1. Share Button — Icon to Left, Narrower Pill Shape

**Current** (line 799-813): Tall square button with icon stacked above text.

**Change**: Convert to a horizontal pill/tablet layout with `flex-row`, icon on the left of "Share this invite" text, auto-width to fit content, reduced height.

```
<button className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/40 bg-primary/10 text-primary">
  <Share2 className="w-4 h-4" />
  <span className="text-xs font-bold whitespace-nowrap">Share this invite</span>
</button>
```

---

### 2. Footer Logo — Slightly Larger

**Current** (line 823-827): `h-8 md:h-10`

**Change**: Increase to `h-12 md:h-14` while keeping the clickable `<a>` link to weddingwaitress.com intact.

---

### 3. Header — Always Show "You're Invited" + Event Name

**Current** (lines 576-587): Shows "You're invited to" then either partner names or event name.

**Change**: Always show "You're Invited" on the first line, and always show the event name (`event.name`) on the second line below. Remove the partner name logic — just display `event.name`.

---

### 4. Countdown & Date Format Changes

**Location**: Lines 593-650

**Date format change** (line 597-602): Replace `toLocaleDateString('en-US', ...)` with custom formatting to produce `"Sunday 20th December 2026"` (day name + ordinal day + month + year). Will add a helper function for ordinal suffixes (1st, 2nd, 3rd, etc.).

**Countdown text** (line 645-648): Change format from `"8 Months, 19 Days, 2 Hours To go"` to `"8 Months, 19 Days, 2 Hours to go"` (lowercase "to go"). Also match the font size of the countdown line to the date/venue lines above it — currently it uses `text-sm md:text-base` which already matches, but ensure `font-bold` is changed to `font-medium` to match the date line weight consistency.

**Font size alignment**: The countdown line currently uses `text-sm md:text-base font-bold`. Change to `text-sm md:text-base font-medium` to match the date and venue lines' visual weight.

---

### Files Modified
- `src/pages/GuestLookup.tsx` — all four changes in this single file

