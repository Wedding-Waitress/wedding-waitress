

# Move Text Zones and Zone Properties Inside the Main Box (Left Side)

## What's changing
The Text Zones list and Zone Properties panels will move from the right side of the layout into the left side of the main purple-bordered card, sitting beside the invitation preview. This uses the empty space visible on the left of the invitation image.

## Layout Change

```text
BEFORE:
+---------------------------+   +----------------+
|                           |   | Text Zones     |
|    [invitation preview]   |   | Zone Properties|
|                           |   |                |
+---------------------------+   +----------------+

AFTER:
+---------------------------------------------------+
| +----------------+                                 |
| | Text Zones     |   [invitation preview centered] |
| | Zone Properties|                                 |
| +----------------+                                 |
+---------------------------------------------------+
```

## File changed

**`src/components/Admin/TemplateTextZoneEditor.tsx`**

- Change the grid layout from `grid-cols-[1fr_380px]` (preview left, panels right) to a single full-width Card
- Inside that Card, use a flex/grid layout: left column (~300px) for Text Zones list + Zone Properties (scrollable), right side for the invitation preview (centered)
- Remove the outer separate Card wrappers for the panels -- they become sections inside the main card
- The instruction text updates from "edit properties on the right" to "edit properties on the left"
- Zone Properties panel gets `overflow-y-auto` with a max height so it scrolls within the card if needed
