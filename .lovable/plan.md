
The goal is to center the Wedding Waitress logo at the bottom of the Running Sheet PDF. Currently, the logo appears left-aligned in the generated PDF. I will update the HTML template used for PDF generation to ensure the logo is explicitly centered using robust CSS properties that work well with the `html2canvas` rendering engine.

### Implementation Steps:

1.  **Update PDF HTML Template**:
    *   Modify `src/lib/runningSheetPdfExporter.ts`.
    *   Update the `logoHtml` string construction.
    *   Change the logo container to ensure it takes the full width and centers its content.
    *   Apply `display: block` and `margin: 0 auto` to the logo image itself, as this is the most reliable method for centering elements in `html2canvas`.
    *   Ensure the "Generated" timestamp remains correctly aligned to the right without affecting the logo's centering.

2.  **Verify Footer Layout**:
    *   Ensure the `flex: 1` spacer correctly pushes the logo and timestamp to the bottom of the page.
    *   Confirm the padding and box-sizing of the main container allow the footer to span the full width of the printable area.

### Technical Details:

*   **File to modify**: `src/lib/runningSheetPdfExporter.ts`
*   **CSS changes**:
    *   Parent `div` of the logo: `width: 100%; text-align: center; margin-top: 20px;`
    *   Logo `img`: `display: block; margin: 0 auto; height: 28px; object-fit: contain;`
*   This approach is consistent with the methodology used in other successful PDF exporters in the application and fixes the left-alignment issue shown in the user's screenshot.
