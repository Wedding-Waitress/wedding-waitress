# Photo Strip Template Bulk Import

Copy all Photo Booth background templates into this folder, then run the importer from the project root.

## Accepted files

- `.jpg`
- `.jpeg`
- `.png`
- Every image must be exactly **1200 × 1800 pixels** in portrait orientation.
- Invalid images are skipped and reported; originals are never resized, cropped, stretched, recompressed or deleted.

## Filename format

Use a descriptive colour followed by a zero-padded number:

- `Blue 001.jpg`
- `Blue 002.jpg`
- `Dusty Blue 004.png`
- `Rose Gold 010.jpeg`

The filename (without its extension) becomes the displayed template name. Recognised colours are listed in the importer report. Files without a recognised colour remain valid and are classified as `Multicolour`.

## Import command

From `C:\Users\User__\Documents\Website Projects\wedding-waitress`, run:

```powershell
npm run import:photo-strip-templates
```

The importer copies valid originals into `public/photobooth-templates/originals`, creates lightweight library thumbnails in `public/photobooth-templates/thumbnails`, and updates the generated catalogue. It is safe to run repeatedly and does not delete this folder or its contents.
