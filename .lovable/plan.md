

# Fix "Use Existing Floor Plan" in Guest Live View

## Problem
When "Use Existing Floor Plan" is selected in the dashboard configuration, guests clicking "Floor Plan" in the Live View see only a placeholder message ("The venue floor plan will be available soon") instead of the actual ceremony floor plan.

## Root Cause
The code in GuestLookup.tsx handles the `source === 'existing'` case with a static placeholder. It never fetches or renders the actual ceremony floor plan data from the `ceremony_floor_plans` table. Additionally, the table has RLS policies that only allow authenticated owners to read their own data, so there's no public access path.

## Solution

### 1. New Database Function (Supabase Migration)
Create a `SECURITY DEFINER` RPC function called `get_public_ceremony_floor_plan(event_slug)` that:
- Takes an event slug as input
- Joins `events` with `ceremony_floor_plans` 
- Only works when `qr_apply_to_live_view = true` (same guard as other public functions)
- Returns floor plan layout data (chairs_per_row, total_rows, assigned_rows, labels, seat_assignments, bridal party data, couple arrangement, etc.)
- Does NOT expose user_id or other sensitive fields

### 2. New Read-Only Floor Plan Component
Create `src/components/GuestView/ReadOnlyCeremonyFloorPlan.tsx`:
- A simplified, non-interactive version of `CeremonyFloorPlanVisual`
- No click handlers, no editing capability
- Renders the same visual layout: bridal party at top, couple + celebrant in center, seating rows with aisle
- Styled for the dark/purple modal background (white text instead of dark text)
- Responsive and scrollable for mobile viewing

### 3. Update GuestLookup.tsx
In the Floor Plan modal (lines 918-927), replace the placeholder with:
- When `source === 'existing'`: call the new RPC function using the event slug
- On success, render the `ReadOnlyCeremonyFloorPlan` component with the returned data
- Show a loading spinner while fetching
- Fall back to "No floor plan configured yet" if no data exists

## Technical Details

### Migration SQL
```sql
CREATE OR REPLACE FUNCTION public.get_public_ceremony_floor_plan(event_slug text)
RETURNS TABLE(
  chairs_per_row integer,
  total_rows integer,
  assigned_rows integer,
  left_side_label text,
  right_side_label text,
  altar_label text,
  seat_assignments jsonb,
  show_row_numbers boolean,
  show_seat_numbers boolean,
  bridal_party_left jsonb,
  bridal_party_right jsonb,
  bridal_party_count_left integer,
  bridal_party_count_right integer,
  bridal_party_roles_left jsonb,
  bridal_party_roles_right jsonb,
  couple_side_arrangement text,
  person_left_name text,
  person_right_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    cfp.chairs_per_row, cfp.total_rows, cfp.assigned_rows,
    cfp.left_side_label, cfp.right_side_label, cfp.altar_label,
    cfp.seat_assignments, cfp.show_row_numbers, cfp.show_seat_numbers,
    cfp.bridal_party_left, cfp.bridal_party_right,
    cfp.bridal_party_count_left, cfp.bridal_party_count_right,
    cfp.bridal_party_roles_left, cfp.bridal_party_roles_right,
    cfp.couple_side_arrangement, cfp.person_left_name, cfp.person_right_name
  FROM ceremony_floor_plans cfp
  JOIN events e ON e.id = cfp.event_id
  WHERE e.slug = event_slug
    AND e.qr_apply_to_live_view = true
  LIMIT 1;
$$;
```

### ReadOnlyCeremonyFloorPlan Component
- Accepts the floor plan data as props (same shape as the RPC return)
- Renders seats as small boxes showing names (non-clickable)
- Renders bridal party members with their roles
- Renders couple circles and celebrant
- Uses white/light colors to work on the purple modal background
- Horizontally scrollable on small screens

### GuestLookup.tsx Changes
- Add state for ceremony floor plan data and loading
- When the floor plan modal opens and source is 'existing', fetch via RPC
- Render `ReadOnlyCeremonyFloorPlan` with the fetched data
- Cache the result so it doesn't re-fetch on every modal open

### Files to Create/Modify
1. **New migration** - `get_public_ceremony_floor_plan` RPC function
2. **New file**: `src/components/GuestView/ReadOnlyCeremonyFloorPlan.tsx`
3. **Modified**: `src/pages/GuestLookup.tsx` - fetch and render floor plan data

### Important Notes
- The locked `CeremonyFloorPlanVisual.tsx` will NOT be modified
- The new read-only component is a separate, simplified rendering
- Existing floor plan dashboard functionality is completely untouched
