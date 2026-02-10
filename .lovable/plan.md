

# Add "View Image" Preview to Place Card Gallery

## Overview

Currently, clicking a gallery thumbnail immediately selects it and closes the modal. This adds a two-step workflow: users can **view** an image full-size first, then decide whether to **select** it or go back to browsing.

## How It Will Work

1. Hovering over a thumbnail shows two overlay buttons: **View** (eye icon) and **Select** (check icon)
2. Clicking **View** opens a large preview overlay within the same modal showing the full image, its name, and category
3. From the preview, the user can click **Use This Image** to select it, or **Back to Gallery** to return
4. Clicking **Select** on the thumbnail works like the current behaviour -- immediate selection

## Technical Details

All changes are in a single file: `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx`

### Changes

1. **Add state** for the previewed image:
   - `const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null);`

2. **Add icons** to imports:
   - Import `Eye`, `Check`, and `ArrowLeft` from `lucide-react`

3. **Replace the single-click thumbnail button** with a two-button hover overlay:
   - **Eye button** -- calls `setPreviewImage(image)` to open the preview
   - **Check button** -- calls `handleSelectImage(image)` for direct selection

4. **Add a preview view** that renders when `previewImage` is set:
   - Full-size image display within the modal
   - Image name and category label
   - "Back to Gallery" button (clears `previewImage`)
   - "Use This Image" button (calls `handleSelectImage` with the previewed image)

5. **Conditionally render** either the gallery grid or the preview view based on whether `previewImage` is set

### Design

- Matches existing Wedding Waitress style: white cards, purple accents, rounded corners
- Preview uses `object-contain` so the full image is visible without cropping
- Overlay buttons use semi-transparent dark backgrounds with white icons for contrast
- Responsive layout works on desktop, tablet, and mobile

