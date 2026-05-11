## Goal

Let you bulk-upload ~300 high-resolution PNG/JPG backgrounds into the **Seating Chart Sign image gallery** without sending them through Lovable chat (which caps at 15 MB per message), while guaranteeing the **Download PDF** button still produces print-quality files for A0 printing.

---

## The core idea

You already have the `optimize-signage-image` Edge Function and the admin upload UI in `SignageGalleryModal`. I'll extend that into a proper **Bulk Admin Uploader** that you use directly from the dashboard — the files go **straight from your browser to Supabase Storage**, completely bypassing Lovable's chat upload limit.

This means:
- You can upload **as many files as you want** (300, 500, 1000+).
- Each file can be up to **50 MB** (the Edge Function's accepted max — plenty of headroom for A0 PNGs).
- Originals are auto-converted to **JPG Q92 at full pixel dimensions** (print master, used by the PDF export).
- **800px JPG Q75 thumbnails** are auto-generated for fast gallery loading.

---

## What I'll build (3 parts)

### 1. Bulk Admin Uploader UI (inside `SignageGalleryModal`)

Add a new **"Bulk Upload" mode** (admin-only, gated by your existing admin check):

- **Multi-file picker** — select all 300 files at once, or drag-and-drop a folder.
- **Per-file rows** showing: thumbnail preview, filename, detected category (auto-guessed from filename, editable), status (queued / uploading / optimizing / done / failed).
- **Default category dropdown** at the top — applies to all files unless overridden per row.
- **Auto-naming** — uses the filename (minus extension, prettified: `Asian_Wedding_-_Chinese_Lantern_Floral.png` → `Asian Wedding - Chinese Lantern Floral`). You can edit any name inline.
- **Concurrency control** — uploads 3 files in parallel (safe for the Edge Function), queue handles the rest automatically.
- **Resume on failure** — failed rows get a **Retry** button; successful rows are skipped on retry.
- **Progress bar** at the top: "47 / 300 uploaded · 2 failed".

### 2. Category presets

Pre-seed a category list so you can sort the 300 images cleanly (you can add/edit later):

- Asian Wedding
- Indian Wedding  
- Persian Wedding
- Classic / Elegant
- Floral
- Modern / Minimal
- Rustic
- Luxury / Gold
- Vintage
- Tropical
- (free text "Other" allowed)

The gallery already filters by category, so guests/users browsing will see them grouped.

### 3. PDF Export confirmation (no code change, just verification)

I'll verify in code that the **Download PDF** button in the seating chart designer is already pulling `image_url` (the full-resolution print master), **not** `thumbnail_url`. If it's not, I'll fix that one line. This guarantees:

- A0 export at 300 DPI uses the original-resolution JPG.
- File size per chart: ~8–13 MB PDF (perfectly printable at any local print shop).
- Visual quality: identical to your source PNG, since JPG Q92 is visually lossless on photographic/illustrated artwork.

---

## How you'll actually upload the 300 images

Once built, the workflow is:

1. Open Seating Chart Sign page → click **Browse Gallery** → switch to **Bulk Upload** tab (admin only).
2. Select default category (e.g. "Asian Wedding") for the first batch.
3. Drag the folder of ~50 Asian Wedding PNGs into the dropzone.
4. Click **Start Upload** → walk away. Each file is uploaded → optimized → stored → row turns green.
5. Repeat per category folder. ~300 images = roughly 30–45 min of unattended upload time on a normal connection.

**No Lovable chat involved. No 15 MB limit. No credits used per image.**

---

## Out of scope (will not touch)

- The seating chart designer canvas, customizer, QR preview, sidebar.
- The Print & Export Studio.
- The Invitations & Cards gallery.
- Any other dashboard page.
- Public-facing pages and locked production files.

---

## Technical details (for reference)

- **Why this bypasses the 15 MB chat limit**: Lovable's chat upload routes attachments through the AI message pipeline. The admin uploader uploads file bytes from your browser straight to the `optimize-signage-image` Edge Function via `supabase.functions.invoke()` — a completely separate path. The only relevant limit becomes the Edge Function's own 50 MB body cap, which is well above your largest source PNG.
- **Concurrency = 3** keeps the Edge Function comfortable; ImageScript JPG encoding at full A0 resolution takes ~3–5 s per image.
- **Print master format**: JPG Q92, sRGB, full pixel dimensions preserved. At A0 / 300 DPI (~9933 × 14043 px) this lands ~8–13 MB per image — visually identical to the PNG source for print.
- **Thumbnail format**: 800 px longest edge, JPG Q75, ~80–150 KB.
- **Database**: no schema changes needed — `signage_gallery_images` already has `image_url`, `thumbnail_url`, `name`, `category`.
- **Storage paths**: `originals/{slug}.jpg`, `thumbs/{slug}.jpg` in the `signage-gallery` bucket (already created).
- **Failure handling**: each upload is independent; one bad file doesn't break the queue.

---

## What I need from you to start

Just **approve this plan** and I'll build it. After that, you point the new uploader at your folder of 300 PNGs and they'll all land in the gallery, optimized, with full print-quality PDF export guaranteed.