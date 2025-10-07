-- Add unique constraint for event_id and user_id combination
-- This allows the upsert operation in useFullSeatingChartSettings to work correctly
ALTER TABLE full_seating_chart_settings 
ADD CONSTRAINT full_seating_chart_settings_event_user_key 
UNIQUE (event_id, user_id);