

## Two Implementations: Family Members Styling + Couple/Family Selection on Edit

### Implementation 1: Styling the Family Members Chips

**File: `src/components/Dashboard/FamilyGroupCombobox.tsx`**

Currently (lines 441-459), the "Family Members:" label uses `text-xs text-muted-foreground` and guest names use a plain `secondary` badge. Changes:

- Make "Family Members:" label use `text-sm text-primary font-medium` (purple, matching form label size)
- Make guest name badges use purple styling: `text-sm bg-primary/10 text-primary border-primary/30`
- Keep the X remove button as-is

---

### Implementation 2: Couple/Family Type Prompt on Edit

**Problem:** When you edit Andrew Anderson and add Angela Anderson as a family member, both guests keep their original `family_group` (empty), so they remain listed as "Individuals" in the guest list. The edit mode submit logic (line 559-596) only updates the current guest's record -- it never updates the linked guest's `family_group` or asks what type of group to create.

**Solution:** After the user clicks "Update Guest" and there are pending family members, show a confirmation dialog asking whether to link them as a **Couple** (exactly 2 people) or a **Family** (3+ people). Then update `family_group` on ALL linked guests.

**Changes:**

1. **New component: `src/components/Dashboard/GroupTypeDialog.tsx`**
   - A simple Dialog with two buttons: "Couple" (orange, max 2 people) and "Family" (blue, 3+ people)
   - Shows the names of guests being linked
   - Returns the selected type to the parent

2. **File: `src/components/Dashboard/AddGuestModal.tsx`** (edit mode submit logic, around line 559)
   - Before completing the edit save, check if `pendingFamilyMembers` has entries
   - If yes, show the GroupTypeDialog instead of saving immediately
   - On dialog confirmation:
     - Generate `family_group` name: for Couple = "LastName1 & LastName2", for Family = "LastName Family"
     - Update the current guest's `family_group` field
     - Update each pending member's `family_group` to the same value
     - Upsert into `family_groups` and `family_group_members` tables (same pattern used in add mode, lines 746-800)
   - If only 1 member is being added (total 2 people), default-highlight "Couple" but allow "Family"
   - If 2+ members are being added (total 3+ people), only show "Family"

**User flow after fix:**
1. Edit Andrew Anderson
2. Search "Angela" in Family Group, add her
3. Click "Update Guest"
4. Dialog appears: "How would you like to group these guests?" with Couple/Family buttons
5. User picks "Couple"
6. Both Andrew and Angela get `family_group = "Anderson & Anderson"` 
7. Guest list now shows them under an orange "Couple" header instead of as individuals

---

### Technical Details

**GroupTypeDialog component:**
- Props: `isOpen`, `onClose`, `onConfirm(type: 'couple' | 'family')`, `guestNames: string[]`, `totalMembers: number`
- Couple button disabled if totalMembers > 2
- Styled to match app design (purple borders, rounded buttons)

**Edit mode submit changes (AddGuestModal.tsx):**
- New state: `showGroupTypeDialog: boolean`, `pendingEditSave: object | null`
- When pendingFamilyMembers.length > 0 on edit submit, store the save data and show dialog
- On dialog confirm, execute the save + update all members' family_group + close

**Family group naming:**
- Couple: `"{Guest1LastName} & {Guest2LastName}"` (or just one name if same)
- Family: `"{PrimaryGuestLastName} Family"`
