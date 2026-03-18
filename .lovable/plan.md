

## Make All Dark Purple Borders 50% Thicker

### Scope

Every visible dark purple border on boxes, cards, containers, form inputs, and structural elements across the app. Excludes spinner animations, focus-visible states, and drag-and-drop indicators.

### Approach

There are three thickness tiers to update:

| Current | New (50% thicker) | Tailwind |
|---------|-------------------|----------|
| 1px (`border`) | 1.5px | `border-[1.5px]` |
| 2px (`border-2`) | 3px | `border-[3px]` |
| 3px (`border-[3px]`) | 4.5px | `border-[4.5px]` (focus states — skip these) |

### Changes

**1. `src/index.css` — `.ww-box` class (covers ~38 files of cards)**
- Line 407: `border: 2px` → `border: 3px`

**2. `border border-primary` containers (1px → 1.5px) — Export Controls & info boxes**
Change `border border-primary` to `border-[1.5px] border-primary` in:
- `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx` (3 instances — stats box, dimensions box, export controls)
- `src/components/Dashboard/Invitations/InvitationsPage.tsx` (2 instances — info box, export controls)
- `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx` (1 instance — export controls)
- `src/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage.tsx` (1 instance — export controls)
- `src/components/Dashboard/FloorPlan/FloorPlanPage.tsx` (1 instance — export controls)
- `src/components/Dashboard/RunningSheet/RunningSheetPage.tsx` (1 instance — export controls)
- `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnairePage.tsx` (1 instance — export controls)
- `src/components/Dashboard/QRCode/KitchenDietaryChart.tsx` (1 instance — export controls)

**3. `border-2 border-primary` containers (2px → 3px) — non-ww-box cards**
Change `border-2 border-primary` to `border-[3px] border-primary` in:
- `src/components/Dashboard/StatsBar.tsx` (Card border)
- `src/components/Dashboard/GuestListTable.tsx` (Card border)
- `src/components/Dashboard/Tables/BulkMoveBar.tsx` (floating bar)
- `src/components/Dashboard/TableCard.tsx` (table card border)

**4. `border-2 border-primary` form inputs (2px → 3px)**
Change `border-2 border-primary` to `border-[3px] border-primary` in:
- `src/components/Dashboard/AddGuestModal.tsx` (all input/select borders — ~8 instances)
- `src/components/GuestLookup/PublicAddGuestModal.tsx` (inputClasses, selectTriggerClasses, close button, textarea — ~5 instances)
- `src/components/Dashboard/FamilyGroupCombobox.tsx` (1 instance)
- `src/components/Dashboard/EventNameCombobox.tsx` (1 instance)
- `src/components/Dashboard/CreateTableModal.tsx` (2 instances)

**5. `border-2 border-[#7248e6]` form inputs (2px → 3px)**
Change `border-2 border-[#7248e6]` to `border-[3px] border-[#7248e6]` in:
- `src/components/Dashboard/CreateTableModal.tsx` (2 instances)
- `src/components/GuestLookup/PublicAddGuestModal.tsx` (2 instances — category toggle, textarea)
- `src/components/Dashboard/AddGuestModal.tsx` (1 instance — category toggle)

**6. `border-2` on `EventDatePicker`, `TimePicker`, `RelationSelector`**
Change `border-2` to `border-[3px]` in:
- `src/components/Dashboard/EventDatePicker.tsx`
- `src/components/Dashboard/TimePicker.tsx`
- `src/components/Dashboard/RelationSelector.tsx`

**7. Sidebar border**
- `src/components/Dashboard/AppSidebar.tsx`: `border border-purple-700` → `border-[1.5px] border-purple-700`

**8. QR Code page purple borders**
- `src/components/Dashboard/QRCode/QRCodeMainCard.tsx`: `border-2 border-purple-200` → `border-[3px] border-purple-200`, `border border-purple-200` → `border-[1.5px] border-purple-200`

**9. Other CSS borders**
- `src/index.css` line 241 `.glass`: `border: 1px` → `border: 1.5px`
- `src/index.css` line 247 `.glass-purple`: `border: 1px` → `border: 1.5px`
- `src/index.css` line 253 `.card-elevated`: `border: 1px` → `border: 1.5px`

### What will NOT change
- Spinner borders (`border-t-transparent` pattern)
- Focus-visible border increases (these are interaction feedback, not resting state)
- Drag-and-drop indicators (`TopDropZone`, `TableGuestList` drop zones)
- Green/red validation borders
- The `event-row--new` animation border (2px → stays, it's a temporary highlight)
- Badge borders
- Non-purple borders

### Summary
~25 files, one central CSS change plus targeted Tailwind class updates. No functional or colour changes.

