

## Guest List Group Headers - Color-Coded by Type

### What Changes

Update the group header rows in the guest list table so that:
- **Family groups** get a **blue background** (`bg-blue-600`) matching the blue "Families" badge, with white text
- **Couple groups** get an **orange background** (`bg-orange-500`) matching the orange "Couples" badge, with white text
- **Individuals** remain unchanged (no group header)

### File to Modify

**`src/components/Dashboard/GuestListTable.tsx`** - Lines 1649-1663

### Current Code (Group Header)
```tsx
<TableRow className="bg-purple-50/50 border-l-4 border-l-[#7248e6]">
  <TableCell colSpan={14} className="py-2 px-4">
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-[#7248e6]" />
      <span className="font-semibold text-sm text-[#7248e6]">
        {group.groupName}
      </span>
      <Badge variant="secondary" className="text-xs">
        {group.type === 'couple' ? 'Couple' : 'Family'} ...
      </Badge>
    </div>
  </TableCell>
</TableRow>
```

### Updated Code
- **TableRow background**: Conditionally apply `bg-blue-600` for families or `bg-orange-500` for couples (full solid background, not faint purple)
- **Users icon**: Change to `text-white`
- **Group name text**: Change to `text-white`
- **Badge**: Change to white text on a semi-transparent white background (`bg-white/20 text-white`) so it blends with the colored header
- **Border-left**: Remove the purple left border since the full background already indicates the group

### Summary
- Single file change, purely cosmetic
- Families get the same blue as the "2 Families" badge at the top
- Couples get the same orange as the "0 Couples" badge at the top
- Individuals are not affected (they have no group header)
