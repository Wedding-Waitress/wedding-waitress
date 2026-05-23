## Root cause

The discrepancy between Lovable preview (Reception works) and your published mobile site (Reception (Coming Soon)) is **not** a code, route, conditional, cache, or build bug.

Verified in the current codebase:
- `src/components/Dashboard/FloorPlan/FloorPlanPage.tsx` (lines 194–215) renders one shared `Select` for both desktop and mobile with two items only: `Ceremony` and `Reception`. There is no "Coming Soon" label, no `lg:` / `max-lg:` gate, no `isMobile` branch.
- Searched the entire `src/` tree for "Coming Soon" — the only Floor‑Plan‑related hit is `QRCodeMainCard.tsx` (an unrelated QR module). No Floor Plan file contains that string.
- `ReceptionFloorPlanPage` is imported and rendered unconditionally when `floorPlanType === 'reception'` (line 302–304). Same component on every viewport.
- There is no separate mobile route, no legacy `FloorPlanPageMobile`, no feature flag, no cached dropdown source — the options are hardcoded JSX.

Your screenshot ("Reception (Coming Soon)") matches the **pre‑Step‑1 build** that is still live on `wedding-waitress.lovable.app`. Lovable preview shows the latest code instantly; the published `.lovable.app` URL only updates when you click **Publish → Update**. Since Steps 1–9 were code/UI changes (frontend only — no edge function or DB migration), they will not appear on the published site until you republish.

## Fix

1. Open the **Publish** dialog (top‑right in the editor, or bottom‑right on mobile preview).
2. Click **Update** to deploy the current frontend (Steps 1–9 incl. Reception, PDF export A4/A3/A2, mobile PinchZoom, fixtures, autosave) to `wedding-waitress.lovable.app`.
3. After ~30 s, hard‑reload the published site on your phone (pull‑to‑refresh, or Safari → close tab → reopen). Mobile Safari aggressively caches the SPA shell, so a hard reload is required the first time after a publish.
4. Verify on published mobile, tablet, and desktop:
   - Dashboard → Floor Plan → dropdown shows **Ceremony** and **Reception** (no "Coming Soon").
   - Selecting Reception loads the new editor with palette, canvas, fixtures, export PDF (A4/A3/A2), reset layout, autosave indicator.
   - Ceremony view still loads exactly as before.

## What I will NOT do

- No code changes. The current code is correct; modifying it would not change what is on production.
- No edits to Ceremony, Tables, Guest List, Landing, or any other page.
- No Phase 1B work until you confirm Reception is live on the published site across all three viewports.

## If Reception is still missing after Publish → Update + hard reload

That would indicate a genuine deploy issue (rare). In that case I will:
1. Check Lovable's published bundle to confirm the new `ReceptionFloorPlanPage` chunk is present.
2. Inspect the live `index.html` for a stale asset hash.
3. Report findings before touching code.

## Action required from you

Click **Publish → Update**, then hard‑reload the published site on your phone and confirm. Reply once verified and I'll mark Phase 1A signed off.
