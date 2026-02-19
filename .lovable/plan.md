
# Fix: Move Assign Relation Popup Higher on Screen

## The Problem
The Assign Relation dialog sits at the default center of the screen (50% from top). When the dropdown opens, it extends below the visible area, cutting off the role options and the "Add New Custom Relation" input.

## The Fix
Override the default vertical positioning on the `DialogContent` so the dialog sits near the top of the screen instead of dead center. This gives plenty of room below for the dropdown to expand.

## Technical Detail

**File: `src/components/Dashboard/RelationAssignmentDialog.tsx`** (line 131)

Change the `DialogContent` className to add `top-[8%] translate-y-0` which overrides the default `top-[50%] translate-y-[-50%]` centering, pushing the dialog up near the red line you indicated in your screenshot.

```
// Before
<DialogContent className="sm:max-w-md rounded-2xl border-2 border-primary/30">

// After
<DialogContent className="sm:max-w-md rounded-2xl border-2 border-primary/30 top-[8%] translate-y-0">
```

This is a single-line change -- no other files affected.
