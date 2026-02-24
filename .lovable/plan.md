
# Fix DJ-MC Questionnaire Public View - Missing Column Error

## Root Cause
The `get_dj_mc_questionnaire_by_token` database function references `s.section_subtitle` in its JSON output, but the `dj_mc_sections` table does not have a `section_subtitle` column. This causes a PostgreSQL error `42703` (column does not exist), which returns a 400 status, and the page displays "Link Unavailable."

## Fix
Run a database migration to update the `get_dj_mc_questionnaire_by_token` function, removing the reference to `s.section_subtitle` from the JSON object it builds.

The function currently builds a JSON object for each section that includes `'section_subtitle', s.section_subtitle` -- this line will be removed since the column does not exist.

No frontend changes are needed. The `DJMCPublicView.tsx` page does not reference `section_subtitle` either, so removing it from the function output is safe.

## Technical Detail

**Database migration**: Recreate the `get_dj_mc_questionnaire_by_token` function with the `section_subtitle` reference removed from the `jsonb_build_object` call. All other logic (token lookup, padding handling, last_accessed_at update, sections/items aggregation) stays identical.
