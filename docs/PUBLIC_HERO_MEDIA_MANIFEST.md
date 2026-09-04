# Public hero media manifest

The authoritative runtime mapping is `src/config/publicHeroManifest.ts`. Generated PNG masters are retained in `src/assets/public-heroes/masters/`; optimized AVIF, WebP and JPEG delivery files are in `public/images/public-heroes/`.

## Route groups

- Homepage: desktop and mobile `home-poster-*` artwork.
- Overview pages: `how-it-works`, `products`, `events`.
- Product pages: one named asset for every product route (`my-events` through `photo-video-sharing`).
- Event pages: `event-weddings`, `event-engagements`, `event-birthdays-parties`, `event-corporate-events`, `event-christmas-seasonal-events`, and `event-memorials-celebrations-of-life`.
- Compact information pages: `pricing`, `faq`, `blog`, `contact`, and `legal` for privacy/terms/cookies.
- Venue pages: `venues`.

All hero imagery is decorative because the adjacent HTML heading and description provide the page meaning. The standard focal treatment keeps subjects to the right and reserves the darker left side for copy. The homepage mobile poster uses a separate portrait composition.

## Image-generation prompt set

Every image used this common art direction: “Photorealistic high-end editorial wedding photography for Wedding Waitress; refined Australian venue and natural warm light; ivory, champagne and espresso palette; authentic candid emotion; elegant but not staged; realistic faces and hands; no text, logos, legible interfaces, QR codes or watermarks; reserve a naturally darker text-safe area on the left; 16:9 landscape.” The mobile homepage variant replaced the final instruction with “9:16 portrait, couple held in the lower-right, text-safe upper-left.”

Subject prompts layered onto that direction were:

- Home: joyful newlyweds and guests at golden-hour reception drinks.
- How it works / Products / Events: planning journey, coordinated wedding details, and a welcoming multi-event celebration respectively.
- Product routes: event dashboard planning; couple reviewing a budget; guest-list coordination; reception tables; guest phone seating lookup with no readable screen; seating signage; invitation suite; place cards; table charts; full seating chart; venue floor-plan discussion; dietary meal coordination; running sheet; DJ/MC coordination; guest photo sharing; and live reception slideshow ambience.
- Event routes: wedding reception, engagement celebration, birthday party, corporate dinner, Christmas function, and a gentle celebration-of-life gathering.
- Information routes: pricing consultation, calm FAQ/help desk, wedding planning journal, customer support, discreet legal-document still life, and venue-directory architecture.

The built-in image-generation mode produced 33 PNG masters. No external stock library or third-party copyrighted image was introduced by this redesign.

## Homepage video production brief

The final motion footage cannot be generated in the current image-only environment. The implemented hero therefore serves the responsive poster without requesting missing video files. When production masters are approved, supply:

- `public/videos/wedding-waitress-home-hero-desktop.mp4`
- `public/videos/wedding-waitress-home-hero-desktop.webm`
- `public/videos/wedding-waitress-home-hero-mobile.mp4`
- `public/videos/wedding-waitress-home-hero-mobile.webm`

Production specification:

- 12–15 second seamless, silent loop; 24 or 25 fps.
- Desktop master: 3840×2160; delivery: 1920×1080 H.264 MP4 and VP9/AV1 WebM.
- Mobile master: 2160×3840; delivery: 1080×1920 H.264 MP4 and VP9/AV1 WebM.
- Natural Australian wedding moments: couple, arrivals, ceremony, reception tables, guest seating lookup, DJ/MC coordination, guest photography and venue memories.
- Preserve a stable text-safe area on the left for desktop and lower-left/centre for mobile.
- No audio, captions, readable third-party brands, generated wording, fake QR codes, abrupt cuts, flashing transitions or distorted faces/hands.
- Target delivery sizes: desktop MP4 ≤ 4.5 MB, desktop WebM ≤ 3.5 MB, mobile MP4 ≤ 3 MB, mobile WebM ≤ 2.5 MB.
- Confirm the first and last frames match closely enough that the loop has no visible jump.

After adding all four files, set `HOMEPAGE_HERO_VIDEO_READY` to `true` in `src/config/publicHeroManifest.ts`. Reduced-motion visitors will continue receiving only the poster, and the accessible play/pause control appears only after playable video is ready.
