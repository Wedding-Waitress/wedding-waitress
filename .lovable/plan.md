

## Move Edit Mode Toggle into Text Position Tab

### What Changes

1. **Lift `editMode` state** from `PlaceCardPreview.tsx` up to `PlaceCardsPage.tsx`
2. **Pass `editMode` + `setEditMode`** as props to both `PlaceCardCustomizer` and `PlaceCardPreview`
3. **Add Edit Mode section** at the top of the "Text Position" tab in `PlaceCardCustomizer.tsx` — same toggle UI (Pencil icon, "Edit Mode" label, Switch)
4. **Remove the Edit Mode toggle** from `PlaceCardPreview.tsx`'s canvas header (keep pagination controls only)

### Files Modified

- **`PlaceCardsPage.tsx`**: Add `const [editMode, setEditMode] = useState(false)` state. Pass `editMode`/`onEditModeChange` to both child components.
- **`PlaceCardCustomizer.tsx`**: Add `editMode` and `onEditModeChange` props. Render the toggle inside a bordered section at the top of `TabsContent value="position"`, before the existing position controls.
- **`PlaceCardPreview.tsx`**: Replace internal `editMode` state with a new `editMode` prop. Remove the toggle UI from the canvas header. Keep `selectedElement` state local since it's only used within the preview.

### UI Detail

The Edit Mode section in the Text Position tab will use the same purple-bordered section style (`border-[1.5px] border-primary rounded-xl p-3`) with the Pencil icon, "Edit Mode" label, and Switch toggle — matching the existing look exactly, just relocated.

