

# Make Invitation Preview Larger with Zoom Control

## What's changing

Two improvements to the Text Zones editor preview:

### 1. Larger default preview size
The preview container currently uses `maxHeight: '70vh'` which constrains it to be small. This will be increased to `maxHeight: '85vh'` so the invitation fills more of the available space by default.

### 2. Zoom slider control
A zoom slider (50% to 150%) will be added above the preview panel. This lets you scale the invitation preview purely visually -- making it larger to see fine details or smaller to see the full layout. The default will be 100%.

## File changed

**`src/components/Admin/TemplateTextZoneEditor.tsx`**

### Changes:
1. Add a `zoom` state variable (default: 100).
2. Add a zoom slider bar with a label (e.g., "Zoom: 100%") positioned above the preview, inside the preview Card. Include `ZoomIn` and `ZoomOut` icons and a "Reset" button.
3. Apply the zoom as a CSS `transform: scale()` on the preview container, with `transform-origin: top center` so it scales from the top. Wrap it in an overflow container so it remains scrollable if zoomed in beyond the card area.
4. Increase the default `maxHeight` from `70vh` to `85vh`.

