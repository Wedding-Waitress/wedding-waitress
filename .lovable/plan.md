

## Plan: Split Floor Plan into Ceremony & Reception Floor Plans

### Summary
Rename the existing "Floor Plan" module to "Ceremony Floor Plan" and add a new "Reception Floor Plan" module. Both have the same two options (Upload an Image / Use Existing Floor Plan), but the Reception's "Use Existing Floor Plan" shows a "Coming soon" label since there's no reception floor plan configuration page yet.

### Database Changes
1. **Add `reception_floor_plan_config` column** to `live_view_module_settings` table (JSONB, default `{}`).
2. **Add `show_reception_floor_plan` column** to `live_view_settings` table (boolean, default false).
3. **Rename** existing columns conceptually — keep `floor_plan_config` as the ceremony floor plan config and `show_floor_plan` as the ceremony toggle (no DB rename needed, just relabel in UI).
4. **Update the RPC function** `get_public_event_with_data_secure` to also return `show_reception_floor_plan` and `reception_floor_plan_config`.

### File Changes

**1. `src/integrations/supabase/types.ts`**
- Add `show_reception_floor_plan` to `live_view_settings` Row/Insert/Update types.
- Add `reception_floor_plan_config` to `live_view_module_settings` Row/Insert/Update types.

**2. `src/hooks/useLiveViewModuleSettings.ts`**
- Add `reception_floor_plan_config` to the `LiveViewModuleSettings` interface and all fetch/update/default logic.

**3. `src/components/Dashboard/QRCode/QRCodeMainCard.tsx`**
- Rename "Floor Plan" heading to "Ceremony Floor Plan" and "Configure Floor Plan Settings" to "Configure Ceremony Floor Plan Settings".
- Duplicate the entire Floor Plan module block for "Reception Floor Plan" using `reception_floor_plan_config` and `show_reception_floor_plan`.
- In the Reception copy: when "Use Existing Floor Plan" is selected, show a "Coming soon" badge/message instead of the green confirmation text.
- Upload functionality for Reception uses a different storage subfolder (`reception_floor_plan/`).

**4. `src/pages/GuestLookup.tsx`**
- Parse `show_reception_floor_plan` from live view settings and `reception_floor_plan_config` from module settings.
- Split the single "Floor Plan" button into two buttons: "Ceremony Floor Plan" and "Reception Floor Plan".
- Add a new `showReceptionFloorPlanModal` state and corresponding Dialog modal.
- The Reception modal shows uploaded image if source is 'upload', or a "Coming soon" placeholder if source is 'existing'.
- Update the button grid layout: Row 1 = RSVP Invite, Welcome Video, Table. Row 2 = Ceremony Floor Plan, Reception Floor Plan, Menu. (Now 7 buttons in a 3-column grid — but "Update Your Details" was removed in a previous change, so this becomes exactly the requested layout.)

**5. `src/hooks/useLiveViewSettings.ts`** (or wherever visibility settings are managed)
- Add `show_reception_floor_plan` to the visibility settings interface and update/toggle logic.

### Guest-Facing Button Layout (7 buttons, 3-col grid)
```text
Row 1: [RSVP Invite] [Welcome Video] [Table]
Row 2: [Ceremony Floor Plan] [Reception Floor Plan] [Menu]
```

### Reception "Use Existing Floor Plan" Behavior
When selected in the dashboard config, instead of the green confirmation box, display:
- A muted/amber info box with text: "Coming soon — Reception floor plan configuration is not yet available."
- The option is still selectable but clearly marked as not functional yet.

