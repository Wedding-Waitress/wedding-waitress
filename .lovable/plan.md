

# Fix: Relation Assignment Popup Not Appearing

## What's Wrong

The "Add Guest" button does nothing because **form validation silently blocks submission**. Here's why:

The form validation rules (in `validation.ts`) require both `relation_partner` and `relation_role` to be non-empty strings. Since the relation field was removed from the form, these fields are always empty when you click "Add Guest" -- so validation fails and the form never submits. The popup code exists and is correct, but it never gets a chance to run.

## The Fix

Make the relation fields optional in the validation rules so the form can submit without them. The relation assignment popup will then appear as intended.

---

## Technical Details

### File: `src/lib/security/validation.ts` (lines 68-74)

**Current** (blocks submission when empty):
```
relation_partner: z.string().min(1, "...").max(50, "...")
relation_role: z.string().min(1, "...").max(50, "...")
```

**Fixed** (allows empty, popup handles the rest):
```
relation_partner: z.string().max(50, "...").optional().or(z.literal(''))
relation_role: z.string().max(50, "...").optional().or(z.literal(''))
```

This is a two-line change. Everything else -- the popup component, the submission logic, the per-member assignments -- is already wired up correctly and will work once validation stops blocking.

