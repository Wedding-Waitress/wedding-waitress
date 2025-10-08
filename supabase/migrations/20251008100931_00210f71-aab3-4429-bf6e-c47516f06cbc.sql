-- Add show_logo column to full_seating_chart_settings table
ALTER TABLE full_seating_chart_settings
ADD COLUMN IF NOT EXISTS show_logo BOOLEAN DEFAULT true;