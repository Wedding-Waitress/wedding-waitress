-- First, drop the old check constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_relation_mode_check;

-- Now update the existing data BEFORE adding new constraint
UPDATE events 
SET relation_mode = 'two' 
WHERE relation_mode = 'wedding';

UPDATE events 
SET relation_mode = 'off' 
WHERE relation_mode = 'disabled';

-- Now add the new check constraint with updated values
ALTER TABLE events ADD CONSTRAINT events_relation_mode_check 
CHECK (relation_mode IN ('two', 'single', 'off'));

-- Add comment to document the valid values
COMMENT ON COLUMN events.relation_mode IS 'Relation mode for the event: two (wedding/engagement), single (birthday/solo), or off (hidden)';