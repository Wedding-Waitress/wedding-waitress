-- Add song_title_artist column to dj_mc_items table
-- This stores the auto-fetched (or manually entered) song metadata separately from the "Names" field

ALTER TABLE dj_mc_items 
ADD COLUMN song_title_artist text DEFAULT NULL;