

# Relation Assignment for Each Party Member

## The Problem
Right now, when you add a Couple or Family, there's only **one** Relation field on the form. All party members automatically get the **same** relation as the main guest. So if the main guest is "Bride -- Father", all family members also become "Bride -- Father" which is wrong.

## The Solution
**Remove** the Relation field from the main form entirely. Instead, when you click "Add Guest", a **step-by-step popup** will appear asking you to choose a relation for **each person** — the main guest first, then each party member one by one.

### How It Will Work

1. You fill in the form as normal (name, table, RSVP, dietary, add party members, etc.) — but **no Relation field** on the form itself
2. You click **"Add Guest"** at the bottom
3. A popup appears: **"Select relation for [Main Guest Name]"** showing the same beautiful Bride/Groom dropdown you already have
4. You pick their relation and click "Next"
5. If there are party members, another popup appears: **"Select relation for [Member 1 Name]"**
6. Repeat for each member
7. After the last one, all guests are saved with their **individual** relations

### For Individual Guests (No Party Members)
- Works the same — one popup appears for that single guest before saving

### For Edit Mode
- Relation popup appears for just the guest being edited (same as now, but as a popup instead of inline)

### Visual Design
- The popup will use the **exact same RelationSelector dropdown** you already love (the Bride/Groom two-column layout)
- A progress indicator showing "Guest 1 of 3" so you know how many are left
- Purple-themed to match the rest of the app
- "Skip" option if you want to leave a guest without a relation
- "Back" button to go to the previous guest if you made a mistake

### What Changes on the Form
- The "Relation *" field and its red-bordered dropdown will be **removed** from the form
- Everything else stays exactly the same
- The form will feel cleaner and less crowded

---

## Technical Details

### Files Modified
1. **`src/components/Dashboard/AddGuestModal.tsx`** — Remove inline RelationSelector, add new state for the relation assignment flow, intercept form submit to show the popup sequence before saving
2. **New component: `src/components/Dashboard/RelationAssignmentDialog.tsx`** — A new Dialog component that steps through each guest, reusing the existing RelationSelector, with progress indicator and navigation buttons

### Data Flow
- When "Add Guest" is clicked, form validation runs (minus relation)
- If valid, a list of people needing relations is built: `[{name, index}]`
- The RelationAssignmentDialog opens, stepping through each person
- Each selection is stored in a temporary array
- On completion, the main guest gets their relation, and each party member gets their individual relation
- Then the database insert happens as normal, but with per-member relations instead of copying

### Relation Requirement
- If relations are **required** (the existing setting), the popup won't let you finish without selecting one for each person
- If relations are **optional**, a "Skip" button allows skipping
- If relations are **hidden** (toggled off), no popup appears at all — saves immediately as it does now
