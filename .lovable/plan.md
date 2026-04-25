# Kiosk Live View Fixes

## 1. Fix "Janet & John" Header in Kiosk Views

**Root cause** (verified via DB query): The selected event row in the database is:
- `name`: "Mahmoud & Linda's Wedding" ✅
- `partner1_name`: "Janet" ❌ (stale)
- `partner2_name`: "John" ❌ (stale)

`src/pages/KioskView.tsx` currently renders:
```tsx
{event.partner1_name && event.partner2_name 
  ? `${event.partner1_name} & ${event.partner2_name}`
  : event.name}
```
So it shows "Janet & John" because both partner fields are populated (with stale data).

**Fix**: Update `src/pages/KioskView.tsx` header to **always display `event.name`** (the synced Event Selection name). This is the value the user explicitly chose in the Event Selection dropdown and guarantees sync across Open Kiosk / Launch Fullscreen / Generate QR — all three use the same `/kiosk/:slug` route.

```tsx
<h1 className="text-3xl font-bold">{event.name}</h1>
```

This removes reliance on the partner_name fields entirely for the kiosk header, ensuring the name always matches what's selected in "Choose Event".

## 2. Rebrand "Pro Tips" Box to Brown Theme

**File**: `src/components/Dashboard/Kiosk/KioskSetup.tsx` (lines 297–310)

**Current** (blue warning style):
- `bg-blue-50`, `border-blue-200`
- `text-blue-600` (icon), `text-blue-800` (heading), `text-blue-700` (list)

**Change to** (warm brown soft info card):
- Background: `bg-[#FAF6F0]` (cream/beige matching dashboard cards)
- Border: `border-primary/30` (soft brown tone)
- Icon (`Info`): `text-primary` (brand brown #967A59)
- Heading text: `text-foreground` (dark brown body color)
- List text: `text-foreground/80` (slightly muted dark brown)
- Keep: rounded corners, padding, layout, spacing — unchanged

## Files to Edit
- `src/pages/KioskView.tsx` — header line displays `event.name` only
- `src/components/Dashboard/Kiosk/KioskSetup.tsx` — Pro Tips color tokens

## Out of Scope
No changes to layout, structure, dropdown, URL building, or any other section.