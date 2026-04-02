

## Plan: Remove Undo from DJ-MC Questionnaire Row Menus

### What
Remove the "Undo" menu item from the 3-dot dropdown in all DJ-MC Questionnaire sections. This applies globally since all sections use the same `DJMCSectionRow` component.

### Changes

**File: `src/components/Dashboard/DJMCQuestionnaire/DJMCSectionRow.tsx`**
1. Remove the `Undo2` icon import
2. Remove `onUndo` and `canUndo` props from the interface and destructuring
3. Remove the two `<DropdownMenuItem>` blocks for Undo (around lines 255-258 and 712-715), plus their following `<DropdownMenuSeparator />`

**File: `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection.tsx`** (if it passes `onUndo`/`canUndo` props)
- Remove any `onUndo` and `canUndo` prop passing to `DJMCSectionRow`

**File: `src/hooks/useUndoStack.ts`**
- Can be deleted entirely as it will no longer be used anywhere

