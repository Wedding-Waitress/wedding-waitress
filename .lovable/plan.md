

# Move Running Sheet Below DJ-MC Questionnaire in Sidebar

## Change

Swap the order of two menu items in `src/components/Dashboard/AppSidebar.tsx` so that "DJ-MC Questionnaire" appears before "Running Sheet" in the sidebar navigation.

## Technical Detail

**File:** `src/components/Dashboard/AppSidebar.tsx` (lines ~55-56 in the `allMenuItems` array)

Current order:
```
{ id: "running-sheet", label: "Running Sheet", icon: ClipboardList },
{ id: "dj-mc-questionnaire", label: "DJ-MC Questionnaire", icon: Music },
```

New order:
```
{ id: "dj-mc-questionnaire", label: "DJ-MC Questionnaire", icon: Music },
{ id: "running-sheet", label: "Running Sheet", icon: ClipboardList },
```

No other files need changes.

