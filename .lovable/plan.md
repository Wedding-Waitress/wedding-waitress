

## Three Changes to the Sort By Dropdown

### 1. Add "Default" option at the bottom

Add a 7th sort option called "Default" below "Families". When selected, it shows guests in the order they were originally added (by `created_at` timestamp or database insertion order). This preserves groups (couples and families stay together) and simply orders everything chronologically.

### 2. Add icons to each option

Each dropdown item will have a small icon on the left side of the label:

| Option | Icon |
|---|---|
| First Name | `UserRound` |
| Last Name | `UserRound` |
| Table No. | `Hash` |
| Individuals | `User` |
| Couples | `Heart` |
| Families | `Users` |
| Default | `ListOrdered` |

### 3. Shrink dropdown width and center text

- Reduce the dropdown width from `w-56` to `w-40` (approximately 30% narrower)
- Center-align all dropdown items using `justify-center`

### Technical Details

**File: `src/components/Dashboard/GuestListTable.tsx`**

**a) Update type and options (lines 104-115)**

Add `'default'` to `SortOption` type. Add a 7th entry to `SORT_OPTIONS` with value `default` and label `Default`. Add an `icon` field to each option referencing a Lucide icon component.

**b) Update sorting logic (lines 649-726)**

For `default` sort: group guests normally (keep couples/families together) but sort by `created_at` ascending (or by original array order if `created_at` is the same). No flattening and no group-type reordering -- just chronological insertion order.

**c) Update dropdown rendering (lines 1637-1646)**

- Change `className="w-56"` to `className="w-40"` on `DropdownMenuContent`
- Render the icon from each option to the left of the label
- Center the content using flex and justify-center

**d) Update default state (line 174)**

Change initial `sortBy` from `'first_name'` to `'default'` so new users see the default order first.

