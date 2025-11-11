-- Drop the old event_type constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;

-- Update existing rows with invalid event_type values to 'seated'
UPDATE events 
SET event_type = 'seated' 
WHERE event_type NOT IN ('seated', 'cocktail') 
OR event_type IS NULL;

-- Set default value for the column
ALTER TABLE events 
ALTER COLUMN event_type SET DEFAULT 'seated';

-- Make it NOT NULL
ALTER TABLE events 
ALTER COLUMN event_type SET NOT NULL;

-- Add the new constraint allowing 'seated' and 'cocktail'
ALTER TABLE events 
ADD CONSTRAINT events_event_type_check 
CHECK (event_type IN ('seated', 'cocktail'));