

# Add "Photo or Logo" Hero Background to Guest Live View

## What You'll Get

A new configuration module called **"Add Your Photo or Logo"** in the Guest Live View Configuration section (QR Code Seating Chart page). When you upload an image, it will appear as the background behind the "You're invited to Jason & Linda's Wedding" header area in the guest's Live View. If no image is uploaded, the existing purple gradient remains.

## How It Works

- In the dashboard, a new module card appears in the Guest Live View Configuration grid (alongside RSVP Invite, Welcome Video, Floor Plan, and Menu)
- Upload a JPG or PNG image (e.g., a couple's photo, event logo, or venue shot)
- The uploaded image replaces the purple gradient background on the guest-facing hero section
- The image is displayed with a dark overlay so the white text remains readable
- If no image is uploaded or the module is toggled off, the original purple gradient stays

## Technical Details

### 1. Database Migration
- Add `hero_image_config` JSONB column to `live_view_module_settings` table (nullable, default null)
- Update the `get_public_event_with_data_secure` RPC function to also return `hero_image_config` from the module settings

### 2. Update TypeScript Types (`src/integrations/supabase/types.ts`)
- Add `hero_image_config` to the `live_view_module_settings` Row, Insert, and Update types

### 3. Update Hook (`src/hooks/useLiveViewModuleSettings.ts`)
- Add `hero_image_config` field to the `LiveViewModuleSettings` interface and all fetch/upsert/revert logic

### 4. Add Module Card in Dashboard (`src/components/Dashboard/QRCode/QRCodeMainCard.tsx`)
- Add a 5th module card titled "Add Your Photo or Logo" with an Image icon
- No toggle switch needed -- the presence of an uploaded image activates it
- Settings accordion allows uploading/replacing/removing an image (JPG/PNG)
- Upload goes to `live-view-uploads` storage bucket under `{userId}/{eventId}/hero_image/` path
- Stores `{ file_url, file_name, file_type, uploaded_at }` in `hero_image_config`

### 5. Update Guest View (`src/pages/GuestLookup.tsx`)
- Extract `hero_image_config` from `moduleSettings` (already returned via RPC)
- If `hero_image_config?.file_url` exists, apply it as a background image on the hero `div` with `background-size: cover`, `background-position: center`, and a semi-transparent dark overlay for text readability
- If no image, keep the existing `bg-gradient-hero` class

### Files to Create/Modify
1. **New migration** -- add `hero_image_config` column + update RPC
2. **Modified**: `src/integrations/supabase/types.ts` -- add new column type
3. **Modified**: `src/hooks/useLiveViewModuleSettings.ts` -- add field
4. **Modified**: `src/components/Dashboard/QRCode/QRCodeMainCard.tsx` -- add module card
5. **Modified**: `src/pages/GuestLookup.tsx` -- render hero background image
