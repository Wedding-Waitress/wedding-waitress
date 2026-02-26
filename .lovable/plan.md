

# Update "Add New Guest" Modal Labels

## Changes (single file: `src/components/Dashboard/AddGuestModal.tsx`)

### 1. Add "Guest Category" label above the Individual/Couple/Family selector
Add a small label "Guest Category" just above the toggle buttons (around line 922), so users know what the selector is for.

### 2. Rename "Party Members (X)" to "Members (X)"
On line 1214, change `Party Members ({partyMembers.length})` to `Members ({partyMembers.length})`. The icon stays.

### 3. Change the green button text based on guest type
On line 1225, instead of always showing "Add a member to this party", make it conditional:
- **Couple**: "Add your partner to make you a couple"
- **Family**: "Add another member to this family"

