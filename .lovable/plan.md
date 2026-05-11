## Quick answers (point form)

- **Your 14.2 MB PNG** is under Lovable's 15 MB combined-message cap, but only just — if you also attach a screenshot in the same message, it tips over. Send that PNG **alone in its own message** (no other attachments) and it should go through. No need to refresh Lovable.
- **You do NOT need to resize pixel dimensions** — pixel dimensions = print sharpness at A0 / 300 DPI. Only change the **format** (PNG → JPG) and **compression**. Visual quality stays identical for print.
- **One-shot ChatGPT prompt you can reuse for every image:**
  > "Convert this PNG to a high-quality JPG at quality 92, sRGB color profile. Keep the original pixel dimensions exactly the same — do NOT resize or downscale. Target file size under 14 MB. Output as .jpg."
- **Why this works for A0 @ 300 DPI:** A0 at 300 DPI ≈ 139 megapixels. JPG Q92 at that pixel count typically lands at 8–13 MB with zero visible artifacts on print, even for fine gold linework and floral detail like your Chinese lantern design.

---

## Plan: Server-side image optimizer for Seating Chart Sign gallery

Goal: you upload **one big PNG** once via the admin gallery, and the server automatically produces a print-quality JPG + a fast web thumbnail. Solves the size problem permanently and makes the gallery load instantly.

### What gets built

**1. New Supabase Edge Function: `optimize-signage-image`**
- Accepts: original image (PNG or JPG) as base64 or signed upload URL + target `name`, `category`
- Uses Deno's `ImageScript` library (no native deps, runs in edge runtime) to:
  - **Print master**: convert PNG → JPG at quality 92, preserve full pixel dimensions, sRGB. This is the file used when a user picks the design in the customizer and exports their PDF.
  - **Web thumbnail**: resize longest edge to 800 px, JPG quality 75. This is what loads in the gallery grid + preview pane (fast, ~80–150 KB).
- Uploads both to the existing `signage-gallery` storage bucket under:
  - `originals/{slug}.jpg` (print master)
  - `thumbs/{slug}.jpg` (web thumbnail)
- Inserts/updates the `signage_gallery_images` row with both URLs.

**2. DB migration: extend `signage_gallery_images`**
- Add `thumbnail_url text` (web thumb) — keep existing `image_url` for the print master.
- No data loss; existing rows stay untouched.

**3. Admin upload UI (new, admin-only)**
- New small admin panel inside `SignageGalleryModal` (visible only to `has_role(admin)`):
  - File picker (accepts up to 50 MB per file — well above your 14 MB needs)
  - Name + category fields
  - "Optimize & Upload" button → calls the edge function → shows progress + final sizes
- This bypasses Lovable's chat upload limit entirely. You upload **directly to Supabase**, not through Lovable chat.

**4. Gallery rendering update**
- Grid + preview pane: use `thumbnail_url` (fast load, no jank).
- "Use This Image" button: pass `image_url` (print master) into the customizer → unchanged PDF export quality.

### What does NOT change
- Customizer / canvas / designer
- PDF export pipeline and DPI logic
- QR preview, sidebar, Print & Export Studio
- Invitations & Cards gallery (separate table/bucket)
- Any other page

### Technical notes
- Edge function uses `ImageScript` (pure TypeScript, works in Deno edge runtime — no Sharp/ImageMagick needed).
- Storage bucket `signage-gallery` is already public-read; we add admin-only INSERT via service role inside the edge function (no client-side write needed).
- Print master stays full-resolution (no pixel downscaling) → A0 @ 300 DPI quality preserved.

### After this is built, your workflow becomes:
1. Open Seating Chart Signs → Gallery → Admin Upload panel
2. Drop in the original 14 MB PNG (or even a 40 MB one)
3. Server returns: print master ~10 MB JPG + thumb ~120 KB JPG
4. Image appears instantly in gallery, loads fast, exports at full A0 print quality

---

**Approve this plan and I'll build it.** Migration + edge function + admin UI in one pass.