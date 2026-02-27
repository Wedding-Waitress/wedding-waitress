
# Add Text Case Control to Invitation Text Zones

## Overview
Add a "Text Case" segmented toggle control to both the Admin template editor and the User customizer panel. The setting transforms displayed text without modifying stored values.

## Changes Required

### 1. Update TextZone type (`src/hooks/useInvitationTemplates.ts`)
Add `text_case` property to the `TextZone` interface:
```
text_case: 'default' | 'upper' | 'lower' | 'title'
```
Default value: `'default'`

### 2. Create a helper function for text case transformation
Add a utility function `applyTextCase(text: string, textCase: string)` that can be shared across preview and export. This will handle:
- `'default'` -- return as-is
- `'upper'` -- apply via CSS `textTransform: 'uppercase'`
- `'lower'` -- apply via CSS `textTransform: 'lowercase'`
- `'title'` -- transform in JS: capitalize first letter of each word, lowercase the rest

For upper/lower, CSS `textTransform` will be used at render time. For title case, the text itself will be transformed in code since CSS `text-transform: capitalize` doesn't lowercase the remaining letters.

### 3. Update Admin Template Editor (`src/components/Admin/TemplateTextZoneEditor.tsx`)
- Add a "Text Case" row after the Letter Spacing control using the existing `ToggleGroup` / `ToggleGroupItem` components
- Four pill-style options on one line: Default | UPPER | lower | Title
- Saves to `text_case` on the zone config

### 4. Update User Customizer (`src/components/Dashboard/Invitations/InvitationCustomizer.tsx`)
- Add the same "Text Case" toggle group in the "Style" card for the active zone
- Uses `customStyles[zoneId].text_case` to override the template default
- Place it after the Letter Spacing slider

### 5. Update Invitation Preview (`src/components/Dashboard/Invitations/InvitationPreview.tsx`)
- In `getZoneStyle()`: add `textTransform` for `'upper'` and `'lower'` cases
- In `getZoneText()`: apply title case transformation when `text_case === 'title'`
- Read `text_case` from `customStyles` override first, then fall back to zone default

### 6. Update default zones (`src/components/Admin/AdminInvitationTemplates.tsx`)
- Add `text_case: 'default'` to the `base()` helper so all new zones include it

### 7. Update Exporter
- The `InvitationExporter` renders the same `InvitationPreview` component, so it will automatically inherit the text case transformation with no additional changes.

## UI Layout
The Text Case control will be a single-row segmented toggle group:

```text
Text Case
[ Default | UPPER | lower | Title ]
```

Using the existing `ToggleGroup` component with `type="single"` and compact sizing to fit on one line.

## Files Modified
1. `src/hooks/useInvitationTemplates.ts` -- add `text_case` to TextZone interface
2. `src/components/Admin/AdminInvitationTemplates.tsx` -- add `text_case: 'default'` to base helper
3. `src/components/Admin/TemplateTextZoneEditor.tsx` -- add Text Case toggle group
4. `src/components/Dashboard/Invitations/InvitationCustomizer.tsx` -- add Text Case toggle group
5. `src/components/Dashboard/Invitations/InvitationPreview.tsx` -- apply text case in style and text output
