
# Update Wording in Relation Assignment Popup

## Changes

Two simple text updates across all guest types (Individual, Couple, Family) since they all share the same components:

### 1. RelationAssignmentDialog.tsx (line 148)
- **Before:** "Select relation for"
- **After:** "What relationship is this guest to the couple?"

### 2. RelationSelector.tsx (line 204)
- **Before:** "Select partner & role"
- **After:** "Select partner and relationship"

Both components are shared across all three Add Guest tabs, so a single change in each file covers Individual, Couple, and Family flows.
