

# Add Drag-to-Reorder for Text Zones in Admin Editor

## What's changing
In the Admin Text Zones editor, the zone list on the right side will become drag-and-drop sortable. You'll be able to grab any zone by its handle icon and drag it up or down to reorder it. Additionally, each zone will have small up/down arrow buttons for quick single-step moves.

## File changed

**`src/components/Admin/TemplateTextZoneEditor.tsx`**

### Changes:
1. **Add up/down arrow buttons** next to each zone in the list (beside the delete button). Clicking the up arrow moves the zone one position higher; clicking the down arrow moves it one position lower. The up arrow is hidden on the first item, and the down arrow is hidden on the last.
2. **Add two helper functions**: `moveZoneUp(id)` and `moveZoneDown(id)` that swap the zone with its neighbour in the `zones` array.
3. The existing `Move` icon (grip handle) remains as a visual indicator that zones are reorderable.

This keeps the implementation simple and dependency-free (no drag-and-drop library needed for a short list), while giving full reordering control.
