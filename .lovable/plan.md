

## Auto-Assign Family Members to Same Table, Seats, and Relation

### The Problem
When adding a family/couple via the "Add Guest" modal, only the primary guest (head of family) gets the table number, seat number, and relation assigned. All other party members are saved with blank table, seat, and relation fields.

### The Solution
When the primary guest has a table and/or relation selected, automatically assign all party members to:
1. **Same table** as the primary guest
2. **Sequential seat numbers** starting from the primary guest's seat + 1 (skipping any already-taken seats)
3. **Same relation** (partner and role) as the primary guest

### How It Works

**Example with your test data:**
- Nader El Alfy: Table 3, Seat 1, Bride Guest
- Nahla Elalfy (1st member added): Table 3, Seat 2, Bride Guest
- Kamal Elalfy (2nd member): Table 3, Seat 3, Bride Guest
- Reema Elalfy (3rd member): Table 3, Seat 4, Bride Guest
- Hala Elalfy (4th member): Table 3, Seat 5, Bride Guest

If a seat is already taken (e.g., seat 2 is occupied), it skips to the next available seat automatically.

If the table doesn't have enough capacity for all members, it will still assign as many as possible and show a warning toast for members that couldn't be seated.

### Technical Details

**File to modify:** `src/components/Dashboard/AddGuestModal.tsx`

**Change:** In the party member insert block (around line 641), update the `memberInserts` mapping to:
- Copy `table_id` and `table_no` from the primary guest's data
- Calculate sequential `seat_no` values, checking against already-taken seats on that table
- Copy `relation_partner`, `relation_role`, and `relation_display` from the primary guest
- Set `assigned: true` when a table is assigned

**Seat collision handling:**
- Fetch current taken seats for the selected table
- Start from primary guest's seat + 1
- Skip any seat numbers already occupied
- Respect the table's seat limit

