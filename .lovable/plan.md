

## Plan: Fix Guest Category (Single/Couple/Family) Logic in Public Add Guest

### Problem
When a guest adds someone via the public Live View and selects "Family", the new guest is added as a standalone Single instead of being added to the referring guest's family group. The `add_guest_public` RPC and `PublicAddGuestModal` don't handle family group assignment at all.

### Three Scenarios to Implement

1. **Family**: New guest is added to the referring guest's existing family group (same `family_group` field, same `family_groups`/`family_group_members` records, inherits table assignment)
2. **Couple**: Referring guest is removed from their current family and placed into a new couple group with the new guest
3. **Single**: New guest is added standalone with no group (current behavior -- already works)

### Changes

#### 1. New SQL Migration -- SECURITY DEFINER RPC
Create `public_manage_guest_group` RPC that handles family group logic since public users can't write to `family_groups`/`family_group_members` tables directly (RLS blocks them).

The function will:
- Accept `_new_guest_id`, `_referring_guest_id`, `_event_id`, `_guest_type` (individual/couple/family)
- **Family**: Look up referring guest's `family_group`, set it on new guest, find or create a `family_groups` row, insert `family_group_members` entry, copy `table_id`/`table_no` from referring guest
- **Couple**: Create a new couple group name (e.g., "LastName & LastName Couple"), update both guests' `family_group`, remove referring guest from old `family_group_members`, create new group entries, copy table assignment
- **Single**: No group changes needed (just the basic insert already done)

Also update `add_guest_public` to accept an optional `_family_group` text parameter to set on the guest record directly.

#### 2. Update `PublicAddGuestModal.tsx`
- Add new props: `addedByGuestFamilyGroup`, `addedByGuestTableId`, `addedByGuestTableNo`
- After successfully inserting each guest via `add_guest_public`, call the new `public_manage_guest_group` RPC with the returned guest ID, referring guest ID, and guest type
- For **Family**: pass the referring guest's family_group so new guests inherit it
- For **Couple**: the RPC handles removing the referring guest from old family and creating the couple

#### 3. Update `GuestLookup.tsx`
- Pass the referring guest's `family_group`, `table_id`, and `table_no` to `PublicAddGuestModal` as new props

### Technical Details

**New RPC function signature:**
```sql
public_manage_guest_group(
  _event_id uuid,
  _new_guest_id uuid,
  _referring_guest_id uuid,
  _guest_type text -- 'individual', 'couple', 'family'
)
```

**Files to modify:**
- New SQL migration (new RPC)
- `src/components/GuestLookup/PublicAddGuestModal.tsx` (call RPC after insert, add props)
- `src/pages/GuestLookup.tsx` (pass additional guest data as props)

