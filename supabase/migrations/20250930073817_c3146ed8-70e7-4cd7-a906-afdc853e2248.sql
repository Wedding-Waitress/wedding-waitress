-- Rename search_update_config to update_details_config
-- Add new config columns for search, invite_video, and welcome_video
ALTER TABLE live_view_module_settings 
  RENAME COLUMN search_update_config TO update_details_config;

ALTER TABLE live_view_module_settings
  ADD COLUMN IF NOT EXISTS search_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS invite_video_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS welcome_video_config jsonb DEFAULT '{}'::jsonb;

-- Rename video_message_config to invite_video_config (migrate data)
UPDATE live_view_module_settings 
SET invite_video_config = video_message_config 
WHERE video_message_config IS NOT NULL AND video_message_config != '{}'::jsonb;

-- Remove old video_message_config column
ALTER TABLE live_view_module_settings 
  DROP COLUMN IF EXISTS video_message_config;