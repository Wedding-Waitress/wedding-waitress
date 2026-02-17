

## Three Changes to Guest List Controls

### 1. Rename "Guests" pill to "Total Guests"

**File: `src/components/Dashboard/GuestListTable.tsx` (line 1586)**

Change the text from `{guestCount} Guest{guestCount !== 1 ? 's' : ''}` to `{guestCount} Total Guest{guestCount !== 1 ? 's' : ''}` (capital T, capital G).

---

### 2. Type of Event buttons: selected = green, unselected = purple

**File: `src/components/Dashboard/GuestListTable.tsx` (lines 1420-1445)**

Currently both "Wedding Or Engagement" and "Birthday, Single Person Event Or Corporate Party" buttons always use purple (`border-primary`, `bg-primary/10`, `text-primary`).

Change so that:
- **Selected** button: green border (`border-green-500`), green text (`text-green-500`), light green background (`bg-green-50`)
- **Unselected** button: stays purple as it currently is

---

### 3. Partner name radio labels: selected = green, unselected = purple, text bold

**File: `src/components/Dashboard/GuestListTable.tsx` (lines 1473-1505)**

Currently both radio labels always use purple styling. Change so that:
- **Selected** label: green border (`border-green-500`), green text (`text-green-500`), light green background (`bg-green-50`), bold text (`font-bold`), green radio accent (`accent-green-500`)
- **Unselected** label: stays purple, bold text (`font-bold`), purple radio accent (`accent-primary`)

This applies to both "Leave Partner 1 and Partner 2 names as Bride and Groom" and "Add new names for Partner 1 and Partner 2" options -- whichever is active gets green styling.

