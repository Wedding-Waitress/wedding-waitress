# Couple Partner Dropdown Safety Filter

**File:** `src/components/Dashboard/AddGuestModal.tsx` (only file touched)

## Change
In the Edit Guest drawer's Relationship Group Override section, the Partner Guest `<SelectContent>` currently filters `eventGuestsForOverride` with only `g.id !== editGuest.id`. Extend that filter to also exclude guests already in a Couple group:

```ts
eventGuestsForOverride.filter(g =>
  g.id !== editGuest.id &&
  !(g.family_group ?? '').includes(' & ') &&
  !(g.family_group ?? '').endsWith(' Couple')
)
```

That is the only edit. No other lines change.

## Out of scope (unchanged)
UI/styling, DB schema, RPCs, seating, table assignments, RSVP, dietary, invites/SMS/email, save behavior, single-member family cleanup, family/individual override flows, group-type detection.

## Verification
1. Open Edit Guest → Group Type → Couple → Partner dropdown:
   - Current guest absent.
   - Anyone whose `family_group` contains ` & ` or ends with ` Couple` absent.
   - Individuals and family members still listed.
2. Saving Individual / Couple / Family flows behave identically to today.
