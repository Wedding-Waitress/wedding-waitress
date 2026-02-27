
# Change Zoom Slider Range to 0-100%

## What's changing
The zoom slider currently ranges from 50% to 150%. It will be changed to range from 0% to 100%, so that at 0% the invitation fits snugly inside the preview panel, and at 100% it displays at full scale.

## File changed

**`src/components/Admin/TemplateTextZoneEditor.tsx`**

1. Change `useState(100)` default to a smaller value (e.g., `50`) so the preview starts at a comfortable fit-in-page size.
2. Update the Slider `min` from `50` to `0` and `max` from `150` to `100`.
3. Update the Reset button to reset to the new default value instead of 100.
4. The `transform: scale()` math stays the same (`zoom / 100`), so at 0% the image will be hidden and at 100% it will be full size. To make 0% mean "fit inside the container" rather than literally invisible, the scale formula will be adjusted: map 0-100 to roughly 0.3-1.0 (i.e., `scale = 0.3 + (zoom / 100) * 0.7`). This way 0% shows the invitation scaled down to ~30% which fits inside the panel, and 100% is full size.
