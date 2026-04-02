

## Sync Shared Link PDF with Dashboard PDF

**Problem:** The `get_running_sheet_by_token` RPC function explicitly builds a JSON object for each item but omits `is_bold`, `is_italic`, and `is_underline` fields. The dashboard fetches items via `select('*')` and gets all columns, so its PDF includes formatting. The shared link PDF does not.

**Root Cause:** The RPC was written before the formatting fields were added. The `jsonb_build_object` in the SQL function only includes `id`, `time_text`, `description_rich`, `responsible`, `order_index`, and `is_section_header`.

### Changes

**1. New Supabase migration** — Update the `get_running_sheet_by_token` function to include the three formatting fields in the items JSON:
- Add `'is_bold', COALESCE(i.is_bold, false)` to `jsonb_build_object`
- Add `'is_italic', COALESCE(i.is_italic, false)` to `jsonb_build_object`
- Add `'is_underline', COALESCE(i.is_underline, false)` to `jsonb_build_object`

Note: These columns may not yet exist on the `running_sheet_items` table in the database. If they don't, we also need to add them via the migration (`ALTER TABLE running_sheet_items ADD COLUMN IF NOT EXISTS is_bold boolean DEFAULT false`, same for `is_italic` and `is_underline`).

**2. Update `src/pages/RunningSheetPublicView.tsx`** — Add `is_bold`, `is_italic`, `is_underline` to the `RunningSheetItem` interface so the data flows through to `exportRunningSheetPDF`.

**3. Update Supabase types** — Regenerate or manually add the three fields to the RPC return type in `src/integrations/supabase/types.ts`.

**No other changes.** The PDF exporter already handles these fields correctly; the only gap is the data not arriving via the shared link RPC.

