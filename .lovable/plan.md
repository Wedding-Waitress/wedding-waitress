## Plan

1. **Confirm the exact modal path used on the public guest page**
   - Keep the fix limited to `src/pages/GuestLookup.tsx` and `src/components/GuestLookup/GuestUpdateModal.tsx` if needed.
   - Do not touch QR Code settings, DJ & MC Questionnaire, database/RPCs, or unrelated pages.

2. **Fix the likely connection failure in `GuestLookup.tsx`**
   - The settings RPC currently runs only during the initial event fetch.
   - Update the public Live View page so `get_guest_song_request_settings_public` is fetched by a dedicated `event?.id` effect as soon as the event id is known.
   - Also refresh the song request settings inside `refreshGuestData()` so published/live pages recover if settings load late or change after the first fetch.
   - Preserve the current props into `GuestUpdateModal`:
     - `songRequestsEnabled={!!songRequestSettings?.enabled}`
     - `songRequestsMax={songRequestSettings?.enabled ? ... : 0}`

3. **Temporarily instrument the public flow, then remove logs**
   - Add short console logging only while debugging to confirm:
     - event slug and event id
     - RPC return value
     - values passed into `GuestUpdateModal`
     - modal guard values (`songRequestsEnabled`, `songRequestsMax`, `isEditable`)
   - Remove all temporary logs before finishing.
   - Keep unrelated existing logs unchanged unless they are part of this temporary instrumentation.

4. **Verify the modal rendering logic**
   - Confirm `GuestUpdateModal` renders Song Requests between:
     - `Dietary Requirements`
     - `Special Requests or Notes`
   - Confirm the render guard is not failing incorrectly.
   - If needed, adjust only the guard/placement so ON settings with `max_requests_per_guest > 0` display the correct number of slots.

5. **Test the published-equivalent public route in preview**
   - Use the known saved event from the database:
     - slug: `jason-lindas-wedidng`
     - settings: `enabled=true`, `max_requests_per_guest=2`
   - Open `/s/jason-lindas-wedidng`, search/select a guest, open `Update Your Information`, and verify:
     - Song Requests appears
     - it is below Dietary Requirements and above Special Requests or Notes
     - it shows 2 song slots
     - saving still calls the existing save flow
   - If browser automation cannot complete the whole interaction, verify by code path and database RPC result, and clearly state that limitation.

6. **Final report**
   - List exactly what changed.
   - List what was tested.
   - Confirm no QR Code settings, DJ & MC Questionnaire, database, RPCs, or unrelated pages were changed.