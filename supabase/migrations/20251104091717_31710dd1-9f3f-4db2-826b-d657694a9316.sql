-- Add relation_mode column to events table
ALTER TABLE events 
ADD COLUMN relation_mode TEXT DEFAULT 'wedding' CHECK (relation_mode IN ('wedding', 'single', 'disabled'));

-- Migrate existing data based on relation_allow_single_partner
UPDATE events 
SET relation_mode = CASE 
  WHEN relation_allow_single_partner = true THEN 'wedding'
  WHEN relation_allow_single_partner = false THEN 'single'
  ELSE 'wedding'
END;