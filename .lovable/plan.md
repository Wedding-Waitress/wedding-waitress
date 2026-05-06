## Goal

On mobile (< 768px), make the **Create Event** and **Edit Event** modals truly full-screen — header at top, scrollable body in the middle, Save/Cancel pinned to the bottom with safe-area padding. Desktop and tablet (≥ 768px) stay exactly as they are today.

## What's wrong now

Both modals currently use `bottomSheetOnMobile` on the shared `DialogContent`. On a real iPhone the sheet still floats mid-screen at ~85dvh with rounded top corners and the form body shows a grey gap above "My Events" behind it (see screenshots). The user wants no sheet — full viewport, no rounded corners, no float.

## Changes

### 1. `src/components/ui/dialog.tsx` — add a new variant

Add a third boolean prop alongside the existing two:

```ts
trueFullScreenOnMobile?: boolean;
```

Keep `fullScreenOnMobile` and `bottomSheetOnMobile` untouched so no other modal in the app changes.

When `trueFullScreenOnMobile` is true, on `max-md:` (< 768px) only, override the default centered positioning with:

- `max-md:fixed max-md:inset-0`
- `max-md:top-0 max-md:left-0 max-md:right-0 max-md:bottom-0`
- `max-md:translate-x-0 max-md:translate-y-0`
- `max-md:w-full max-md:h-[100dvh] max-md:max-h-[100dvh]`
- `max-md:m-0 max-md:rounded-none max-md:border-0`
- `max-md:flex max-md:flex-col`
- Disable the zoom/slide-from-top animation on mobile: `max-md:data-[state=open]:zoom-in-100 max-md:data-[state=closed]:zoom-out-100 max-md:data-[state=open]:slide-in-from-bottom-2 max-md:data-[state=closed]:slide-out-to-bottom-2`
- Do not render the bottom-sheet drag handle in this mode.

Desktop classes (`left-[50%] top-[50%] translate-...`, `sm:rounded-lg`, etc.) remain unchanged because they are only overridden inside the `max-md:` prefix.

### 2. `EventCreateModal.tsx` and `EventEditModal.tsx`

On the `<DialogContent>`:

- Replace `bottomSheetOnMobile` with `trueFullScreenOnMobile`.
- Update className from `"max-w-3xl max-h-[90vh] flex flex-col px-4 sm:px-8"` to `"max-w-3xl max-h-[90vh] flex flex-col px-4 sm:px-8 max-md:max-h-[100dvh] max-md:px-4"` so on mobile the height fills the viewport and no extra horizontal padding fights the full-bleed layout. Desktop classes are preserved exactly.
- No JSX, field, validation, header, or footer text changes.

### 3. Pin footer to bottom on mobile (both modals)

The body div already has `flex-1 overflow-y-auto`. Update the wrapping `DialogFooter` (or its container) on each modal so on mobile only it sticks to the bottom of the viewport with safe-area padding:

Add these utility classes to the existing footer wrapper without altering its other styles:

```
max-md:sticky max-md:bottom-0 max-md:left-0 max-md:right-0
max-md:bg-background max-md:border-t max-md:border-border
max-md:px-4 max-md:pt-3
max-md:pb-[max(16px,env(safe-area-inset-bottom))]
```

Also remove the existing `pb-40` from the scroll container on mobile (replace `pb-40` with `pb-40 max-md:pb-6`) so the form body no longer reserves 160px of empty space — the sticky footer handles spacing.

### 4. Keyboard awareness

Existing `focusin` → `scrollIntoView` effect inside both modals stays as-is. With a sticky footer and `flex-1 overflow-y-auto` body, focused inputs continue to scroll into view above the iOS keyboard.

## Out of scope

- All other modals/popups across the app (they don't use `trueFullScreenOnMobile`).
- Desktop and tablet layouts (≥ 768px) — visually and behaviourally unchanged.
- My Events page itself, list, cards, headers, buttons.
- Guest List, Tables, and every other page.

## Acceptance

- iPhone (< 768px): tapping Create or Edit on My Events opens a modal that fills the entire screen edge-to-edge with no rounded corners, no drag handle, no visible page behind it. Header at top, scrollable form in the middle, green Save / red Cancel pinned at the bottom respecting the iOS home-indicator safe area. Focused inputs scroll above the keyboard.
- Tablet (≥ 768px) and Desktop: identical to today.
- No other modal or page is affected.

## Files touched

- `src/components/ui/dialog.tsx` (additive prop only)
- `src/components/Dashboard/EventCreateModal.tsx`
- `src/components/Dashboard/EventEditModal.tsx`
