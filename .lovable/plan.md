

## Plan: Add "Edit with Canva" button to Place Cards Background section

### Summary
Add the same "Edit with Canva" button and helper text from the Invitations page into the Place Cards customizer, positioned below the "Choose File" and "Image Gallery" buttons in the background image upload section.

### File Changes

#### `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`
- **Import** `canvaLogo` from `@/assets/canva-logo.png`.
- **After line 702** (closing `</div>` of the Choose File + Image Gallery button row), insert:
  - A full-width gradient "Edit with Canva" button (`w-full mt-2 rounded-full variant="gradient"`) with the Canva logo (`h-7 w-7 rounded-full object-contain`).
  - A helper `<p>` with text: *"Want more design freedom? Click 'Edit with Canva' to customise your place card using Canva. After downloading your design as PNG or PDF, return here and upload it to Wedding Waitress."*
- No other changes to any other file.

