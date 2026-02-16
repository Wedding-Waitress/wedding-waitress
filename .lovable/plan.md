

## Add Hover Tooltips to Guest List Actions and Notes Column

### What Changes

**File: `src/components/Dashboard/GuestListTable.tsx`**

1. **Edit button tooltip**: Wrap the green Edit icon button (line 1866-1872) with a `Tooltip` component that shows "Edit" on hover.

2. **Delete button tooltip**: Wrap the red Trash2 icon button (line 1873-1879) with a `Tooltip` component that shows "Delete" on hover.

3. **Notes "YES" badge tooltip**: Update the Notes column (line 1863) so that when the guest has notes (green "YES" badge), hovering over it shows the actual notes content. The red "NO" badge will have no tooltip.

   This will be done by replacing the `renderPill` call for notes with inline logic:
   - If notes exist: wrap the green YES badge in a `Tooltip` that displays `guest.notes`
   - If no notes: show the red NO badge as-is (no tooltip)

4. **Add Tooltip imports**: Import `Tooltip`, `TooltipTrigger`, `TooltipContent`, and `TooltipProvider` from `@/components/ui/tooltip` (already exists in the project).

### What Does NOT Change
- No other columns, pages, or features affected
- The Edit/Delete button functionality stays the same
- The Notes badge styling stays the same (green YES / red NO)

