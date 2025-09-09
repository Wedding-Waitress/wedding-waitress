-- Add new columns to guests table for enhanced guest management
ALTER TABLE public.guests 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN table_no INTEGER,
ADD COLUMN seat_no INTEGER,
ADD COLUMN assigned BOOLEAN DEFAULT false,
ADD COLUMN rsvp TEXT DEFAULT 'Pending',
ADD COLUMN dietary TEXT DEFAULT 'NA',
ADD COLUMN mobile TEXT,
ADD COLUMN notes TEXT;

-- Update existing data: split name into first_name and last_name if name exists
UPDATE public.guests 
SET first_name = SPLIT_PART(name, ' ', 1), 
    last_name = CASE 
        WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
        THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
        ELSE ''
    END
WHERE name IS NOT NULL AND first_name IS NULL;

-- Make first_name required (after data migration)
ALTER TABLE public.guests ALTER COLUMN first_name SET NOT NULL;

-- Drop the old name column since we now have first_name and last_name
ALTER TABLE public.guests DROP COLUMN name;