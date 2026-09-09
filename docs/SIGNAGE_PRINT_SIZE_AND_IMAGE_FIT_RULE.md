# Seating Chart Signs: paper sizes and image-fit rule

Approved by Nader on 5 September 2026. This supersedes the earlier fixed-A4-preview and eight-size behaviour recorded in SIGNAGE_QA_2026-09-05.md.

## Supported portrait sizes

| Size | Width × height (mm) |
| --- | --- |
| A0 | 841 × 1189 |
| A1 (default) | 594 × 841 |
| A2 | 420 × 594 |
| A3 | 297 × 420 |

These are ISO A-series trimmed sheet dimensions, verified against the [Canon Australia paper-size specification](https://www.canon.com.au/support/sims-content?cid=A4FA470F1923400BAE0AA876F7EBD93A&pid=b24f2f9af10644e4a06b4a6cb751246a). The governing international paper-size specification is [ISO 216:2007](https://www.iso.org/standard/36631.html). Do not confuse A0 (zero) with AO (letter O), or standard sizes with A2+/A3+ printer media.

## Product rule

- The selected size controls the physical dimensions of the one visible sign renderer and its PDF. There is no separate export layout and no export-only letterboxing.
- Backgrounds fill the paper proportionally without stretching. The preview shows the same cropping as the PDF.
- Before applying an image with different proportions, show a crop-consent dialog with the original image, shaded excluded areas and the proposed fitted background.
- Offer exactly two decisions: Adjust to fit, or Cancel and upload another image. Closing the dialog also cancels. Cancellation preserves the current image and selected paper size.
- Check both template selection and file uploads. Upload consent happens before storage upload. Also check changes of paper size and export of a previously saved image.
- Approvals are remembered for that image, paper size and crop position during the current page session. New image/paper combinations are checked again. Very small proportional differences below 0.2% are treated as image/paper rounding.
- Image decoding failures block the proposed replacement with an error. An unchanged original file is retained; cropping is a rendering choice, not a destructive edit to the source image.
- On-screen zoom changes only presentation. Fit the editing-column width; do not reset zoom because the preview's height changed. Export clears selection handles and temporarily disables editor interaction while capturing.

## Validation

- 85 focused tests passed: 81 across Signs, crop consent, crop geometry, zoom, autosave, PDF geometry and the protected Individual Table Charts suite; plus 4 shared mirror-contract tests.
- Local production build passed. Existing Browserslist age and large-chunk warnings remain.
- Actual browser: paper-size cancel/approve, template cancel/selection, upload cancel/approve, storage cleanup and stable zoom-in/zoom-out/slider verified. The user's Eiffel Tower Brown Elegant template was restored.
- Twelve rendered-PDF comparisons passed: portrait, landscape and square fixtures at each of A0/A1/A2/A3. Every PDF had the selected physical dimensions and no added white corners. The largest difference was 0.21559% against the repository's 0.25% mirror tolerance.
- Actual template PDF comparisons also passed for all four paper sizes during this work. The resulting PDF images were visually inspected.
- Evidence: `%TEMP%/ww-signage-qa/image-paper-matrix.json`, the twelve preview/PDF image pairs, and crop-dialog/zoom screenshots.
- Physical printer output, print-shop finishing and device colour calibration are not verified by these digital checks. This rule covers matching preview and PDF document layout.

No push, deployment or migration. Live saves were restricted to the authorised Wendy & Tom test event. The test upload was deleted after restoring the user's background.
