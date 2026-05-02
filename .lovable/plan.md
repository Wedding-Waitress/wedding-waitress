# Global Modal Design System

Goal: Make every modal (Add Guest, Create/Edit Event, Confirm/Delete, etc.) render as a **centered card** with consistent padding, max-width, radius, and footer button styling — matching the Create Event modal across mobile, tablet, and desktop. No functional changes.

## Reference baseline (Create Event modal)
- Container: `max-w-3xl max-h-[90vh] flex flex-col`
- Padding: `px-4 sm:px-8 py-6`
- Mobile margins: `max-lg:w-[calc(100%-3rem)] max-lg:max-w-[calc(100%-3rem)] max-lg:mx-auto`
- Border radius: `rounded-xl` on mobile, `sm:rounded-lg` upgraded to `rounded-xl`
- Footer: green Save LEFT + red Cancel RIGHT, `h-11`, equal width on mobile

## Step 1 — Bake the system into `DialogContent`

Edit `src/components/ui/dialog.tsx` so that **without any extra classes**, every dialog already looks like the Create Event card:

- Default container becomes a centered card on every breakpoint:
  - `w-[calc(100%-2rem)] sm:w-full max-w-lg` (overridable per-modal)
  - `rounded-xl` (replace `sm:rounded-lg`)
  - `max-h-[90vh] flex flex-col`
  - `bg-background shadow-xl border border-border`
  - Padding: `p-5 sm:p-6` (modals can opt into `px-4 sm:px-8` for form-heavy screens)
- Remove the `fullScreenOnMobile` full-bleed branch (or keep the prop but make it a no-op alias for the standard card). All modals — including AddGuest — become centered cards on mobile.
- Keep the existing close (X) button position.

Add a small variant prop for sizing:
```
size?: "sm" | "md" | "lg" | "xl"  // maps to max-w-md / lg / 2xl / 3xl
```
Default `md`. Confirm/Delete dialogs use `sm`; form modals use `lg` or `xl`.

## Step 2 — Standard `DialogFooter`

Update `DialogFooter` so footers automatically render the locked mobile pattern:
- Mobile: `flex flex-row gap-3` with each button `flex-1 h-11`
- Desktop: `sm:justify-end sm:flex-row-reverse` so primary stays prominent
- Sticky on mobile: `max-lg:sticky max-lg:bottom-0 max-lg:bg-background max-lg:pt-4 max-lg:-mx-5 max-lg:px-5 max-lg:border-t`

This means existing modals that already pass custom footer classes keep working; ones that don't immediately get the correct layout.

## Step 3 — Audit + cleanup pass on existing modals

For each modal listed below, **remove** any of these now-redundant overrides so they inherit the new defaults:
- `fullScreenOnMobile`
- Manual `max-lg:w-[calc(100%-Xrem)] max-lg:max-w-… max-lg:mx-auto`
- Manual `max-sm:rounded-none`, `max-sm:h-full`, `max-sm:inset-0`
- Per-modal `p-0` / oversized paddings that conflict with the new defaults

Files to clean (functionality untouched, only `DialogContent` className + footer wrapper):
- `src/components/Dashboard/AddGuestModal.tsx`
- `src/components/Dashboard/EventCreateModal.tsx` (verify it still renders identically)
- `src/components/Dashboard/EventEditModal.tsx`
- `src/components/Dashboard/CreateTableModal.tsx`
- `src/components/Dashboard/DeleteConfirmationModal.tsx`
- `src/components/Dashboard/GuestDeleteConfirmationModal.tsx`
- `src/components/Dashboard/GuestLimitDialog.tsx`
- `src/components/Dashboard/GroupTypeDialog.tsx`
- `src/components/Dashboard/BulkRsvpUpdateModal.tsx`
- `src/components/Dashboard/BulkTableAssignmentModal.tsx`
- `src/components/Dashboard/SendRsvpConfirmModal.tsx`
- `src/components/Dashboard/RsvpActivationModal.tsx`
- `src/components/Dashboard/PlanExpiredModal.tsx`
- `src/components/Dashboard/ExtendPlanModal.tsx`
- `src/components/Dashboard/ImportErrorModal.tsx`
- `src/components/Dashboard/RelationAssignmentDialog.tsx`
- `src/components/Dashboard/RelationSettingsModal.tsx`
- `src/components/Account/EditDetailsModal.tsx`
- `src/components/Account/ChangePasswordModal.tsx`
- Sharing modals: `SeatingChartShareModal`, `RunningSheetShareModal`, `DJMCShareModal`, `InvitationSendModal`, `InvitationGalleryModal`, `PlaceCardGalleryModal`

For confirm/delete dialogs, also pass `size="sm"`.

## Step 4 — Locked surfaces NOT touched
- Public/Landing/Auth modals (`SignInModal`, `SignUpModal`, `CookieBanner`) — locked public surface, skipped.
- `GuestLookup` and other public guest-facing modals — skipped (separate locked spec).
- `alert-dialog.tsx` — left alone (separate primitive); only `dialog.tsx` is updated.
- Locked stable pages remain visually identical because the new defaults match Create Event, which is already the reference for the locked Mobile Modal System rule.

## Technical details

### `dialog.tsx` change sketch
```tsx
const sizeMap = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-3xl" };

<DialogPrimitive.Content
  className={cn(
    "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
    "flex flex-col w-[calc(100%-2rem)] sm:w-full",
    sizeMap[size ?? "md"],
    "max-h-[90vh] rounded-xl border border-border bg-background shadow-xl",
    "p-5 sm:p-6 gap-4",
    "data-[state=open]:animate-in data-[state=closed]:animate-out ...",
    className,
  )}
/>
```

### `DialogFooter` change sketch
```tsx
<div className={cn(
  "flex flex-row gap-3 pt-2",
  "max-lg:sticky max-lg:bottom-0 max-lg:bg-background max-lg:-mx-5 max-lg:px-5 max-lg:pt-4 max-lg:border-t max-lg:border-border",
  "sm:justify-end sm:flex-row-reverse",
  "[&>button]:flex-1 sm:[&>button]:flex-none [&>button]:h-11",
  className,
)} />
```

### Memory update
After implementation, update `mem://design/mobile-modal-system` to record that the system is now enforced by `DialogContent` defaults rather than per-modal classes, and add a Core rule:
> All modals inherit centered-card layout from `DialogContent`. Do not re-add `fullScreenOnMobile` or manual mobile width overrides.

## Verification
- Browser at 390×844: Add Guest, Create Event, Edit Event, Delete Guest, Create Table, Bulk RSVP all show as centered cards with ~16px side margins, rounded corners, sticky footer, green-left/red-right buttons.
- 768×1024: same layout, wider max-width.
- 1280×720: centered, max-width respected, no regressions on locked Dashboard pages.
