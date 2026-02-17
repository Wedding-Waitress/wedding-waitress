

## Rearrange Guest List Controls Layout

### What Changes

**File: `src/components/Dashboard/GuestListTable.tsx` (lines 1563-1575)**

Merge all items onto a single row with this order:

**Left side:** Search guests input, Individuals pill, Couples pill, Families pill, Guests pill

**Right side:** Sort By, Import/Export CSV, Add Guest (unchanged)

### Technical Detail

- Remove the separate left-side container that currently holds Individuals/Couples/Families (lines 1564-1575)
- Move those three pills into the right-side container (line 1578), placing them after Search and before the Guests pill
- The outer flex container with `justify-between` keeps the left/right split
- Left group: Search input, then the three category pills, then Guests count
- Right group: Sort By, Import/Export, Add Guest (no changes needed)

