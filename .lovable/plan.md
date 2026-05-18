Plan to fix only the Seating Chart Signs page:

1. Make the on-page preview lightweight and smooth
- Change the Seating Chart Signs editor preview to use a smaller web-display image, not the original Topaz/master file.
- Target a visually sharp A4 preview size, but much smaller transfer/decode cost: roughly 1200–1600px longest edge at compressed JPEG quality.
- Keep the original master URL stored separately for print export.
- Keep the current A4 preview frame size and zoom controls.

2. Add/adjust backend image variant support for signage gallery images
- Update the existing signage image optimization path so gallery selections have:
  - `image_url` / print URL = full-resolution master for PDF.
  - `preview_url` or equivalent lightweight URL = small display-only variant.
  - `thumbnail_url` = gallery grid thumbnail.
- For existing gallery rows that do not yet have a dedicated preview variant, derive a smaller Supabase transformed preview URL from the master instead of rendering the master in the editor.
- No changes to Invitations or Name Place Cards.

3. Replace the Seating Chart Signs PDF export path with a signage-only exporter
- Do not use the shared invitation/html2canvas export for this button, because A1/A2 at 300 DPI creates huge canvases and can freeze the browser.
- Create a signage-only PDF generation path that:
  - Uses the original master image URL for the background.
  - Embeds the background directly into jsPDF instead of screenshotting the entire A1/A2 DOM canvas.
  - Adds text zones and QR code overlays on top at print-page coordinates.
  - Saves the PDF using the existing async Blob download helper.
- Keep PDF quality high by using the master image, while avoiding the massive browser canvas that causes “taking forever then stops”.

4. Improve export feedback and failure messages
- Keep the green button active when print size plus background image/colour exist.
- Show a clear progress state while the PDF is being prepared.
- If export fails, show the real error message in the toast.

5. Verification
- Confirm the editor preview URL is not the master/original file and not the 400px thumbnail.
- Confirm the visible A4 preview stays sharp and zoom still works.
- Confirm “Download Print-Ready PDF” uses the master/original image URL and downloads without freezing.
- Confirm no changes are made to upload logic outside signage, Invitations, Name Place Cards, or the page design.