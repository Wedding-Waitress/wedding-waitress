## Goal

On the My Events page, make the **Create Event** and **Edit Event** popups open as a **bottom sheet** on mobile (< 768px). Desktop and tablet behaviour stays exactly the same.

## What's wrong today

The Create / Edit Event modal uses the shared `DialogContent` with `fullScreenOnMobile`. On mobile we top-anchor it (`max-lg:top-[2dvh]`), which on a real iPhone with the keyboard open pushes the form upward and clips the top, while the green Save / red Cancel footer floats mid-screen (as in the screenshots). It needs to behave like a native bottom sheet.

## Scope

- Only two files behaviourally affected:
  - `src/components/Dashboard/EventCreateModal.tsx`
  - `src/components/Dashboard/EventEditModal.tsx`
- One additive change to the shared dialog primitive:
  - `src/components/ui/dialog.tsx` — add a new optional `bottomSheetOnMobile` prop. **No change to existing default behaviour**, so every other modal in the app is untouched.

## Implementation

### 1. `src/components/ui/dialog.tsx` (additive only)

Add a new prop on `DialogContent`:

```ts
bottomSheetOnMobile?: boolean;
```

When `bottomSheetOnMobile` is true, on `max-md:` (< 768px) only, override positioning with these classes (instead of the existing `fullScreenOnMobile` / `max-sm` block):

- `max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:top-auto`
- `max-md:translate-x-0 max-md:translate-y-0`
- `max-md:w-full max-md:max-w-full max-md:mx-0`
- `max-md:max-h-[85vh] max-md:overflow-y-auto`
- `max-md:rounded-t-[20px] max-md:rounded-b-none`
- Slide-up animation: `max-md:data-[state=open]:slide-in-from-bottom max-md:data-[state=closed]:slide-out-to-bottom` (and disable the existing zoom on mobile via `max-md:data-[state=open]:zoom-in-100 max-md:data-[state=closed]:zoom-out-100`)

Inside `DialogContent`, when `bottomSheetOnMobile` is true, render a small grey drag handle as the first child, visible only on mobile:

```tsx
{bottomSheetOnMobile && (
  <div className="md:hidden mx-auto -mt-2 mb-2 h-1 w-10 rounded-full bg-[#ccc]" />
)}
```

Backdrop tap-to-close already exists via Radix `DialogOverlay` (`bg-black/80`) — we'll keep it (it's already semi-transparent dark and closes the sheet on tap). No extra backdrop needed.

`fullScreenOnMobile` and existing default behaviour remain unchanged, so no other dialog in the app is affected.

### 2. `EventCreateModal.tsx` and `EventEditModal.tsx`

On the `<DialogContent>`:
- Replace `fullScreenOnMobile` with `bottomSheetOnMobile`.
- Remove the mobile-only width overrides (`max-lg:w-[calc(100%-3rem)] max-lg:max-w-[calc(100%-3rem)] max-lg:mx-auto`) so the sheet spans full width on mobile. Desktop classes (`max-w-3xl`, `max-h-[90vh]`, `flex flex-col`, `px-4 sm:px-8`) stay as-is.
- No change to header, body, footer, fields, validation, or any other JSX.

### 3. Keyboard awareness

The sheet body already uses `overflow-y-auto`. To make sure the focused input scrolls into view above the iOS keyboard, add a tiny effect inside both modals:

```ts
useEffect(() => {
  if (!isOpen) return;
  const onFocus = (e: FocusEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
      setTimeout(() => t.scrollIntoView({ block: "center", behavior: "smooth" }), 150);
    }
  };
  document.addEventListener("focusin", onFocus);
  return () => document.removeEventListener("focusin", onFocus);
}, [isOpen]);
```

Pure behaviour, no UI change.

## Out of scope

- All other modals across the app stay exactly as they are.
- No changes to desktop/tablet visuals (≥ 768px).
- No changes to My Events list, cards, buttons, headers, or any other page.
- Guest List, Tables, etc. are not touched.

## Acceptance

- iPhone: tapping Create or Edit on My Events slides a sheet up from the bottom with a grey drag handle, rounded top corners, ~85vh tall, scrollable; tapping the dark backdrop closes it; focused inputs scroll above the keyboard; Save / Cancel footer sits at the bottom of the sheet content as today.
- Tablet (≥ 768px) and Desktop: modal looks and behaves exactly as it does now.
- No other page or modal changes.
