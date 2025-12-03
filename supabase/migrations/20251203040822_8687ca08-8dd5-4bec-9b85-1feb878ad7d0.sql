UPDATE live_view_module_settings 
SET welcome_video_config = jsonb_set(
  welcome_video_config, 
  '{video_url}', 
  '"https://iframe.cloudflarestream.com/97bab4c8f38eb577ef6dd45595036de8"'
)
WHERE event_id = '2d2e5cdb-65a3-4bf5-8a77-00f2e43d6a81';