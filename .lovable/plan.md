

# Lock the Guest List Page for Production

Add production-lock warning headers to all Guest List page component and hook files that are not yet protected. This is the same pattern used on the Tables page, Full Seating Chart, Place Cards, and other locked features.

## Already Locked (no changes needed)
- GuestListTable.tsx
- AddGuestModal.tsx
- GuestDeleteConfirmationModal.tsx
- useRealtimeGuests.ts

## Files to Lock (16 files)

### Component files (15)
1. **GuestBulkActionsBar.tsx** -- Bulk selection action bar (select all, delete, RSVP, email, SMS)
2. **GuestMobileCard.tsx** -- Mobile-friendly guest card layout
3. **BulkRsvpUpdateModal.tsx** -- Bulk RSVP status update modal
4. **BulkTableAssignmentModal.tsx** -- Bulk table assignment modal
5. **StatsBar.tsx** -- Guest/table statistics bar
6. **FamilyGroupCombobox.tsx** -- Family group selector
7. **RelationSelector.tsx** -- Relation assignment selector
8. **RelationBadge.tsx** -- Relation display badge
9. **RelationAssignmentDialog.tsx** -- Relation assignment dialog
10. **RelationSettingsModal.tsx** -- Relation settings configuration
11. **CustomRoleManager.tsx** -- Custom role management
12. **GroupTypeDialog.tsx** -- Group type selection dialog
13. **ImportErrorModal.tsx** -- Import error display modal
14. **SendRsvpConfirmModal.tsx** -- RSVP send confirmation modal
15. **RsvpActivationModal.tsx** -- RSVP activation modal

### Hook files (1)
16. **src/hooks/useGuests.ts** -- Core guest CRUD operations hook

## What Gets Added

Each file receives this header block at the very top (before any existing code):

```text
/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The Guest List page feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break guest list management
 * - Changes could break bulk actions and RSVP workflows
 * - Changes could break real-time synchronisation
 *
 * Last locked: 2026-02-19
 */
```

No functional code changes -- only protective comment headers are added.

