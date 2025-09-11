-- Add new "Who Is" columns to guests table
ALTER TABLE public.guests 
ADD COLUMN who_is_partner TEXT NOT NULL DEFAULT '',
ADD COLUMN who_is_role TEXT NOT NULL DEFAULT '',
ADD COLUMN who_is_display TEXT NOT NULL DEFAULT '';

-- Add check constraints for valid values
ALTER TABLE public.guests 
ADD CONSTRAINT check_who_is_partner 
CHECK (who_is_partner IN ('', 'partner_one', 'partner_two'));

ALTER TABLE public.guests 
ADD CONSTRAINT check_who_is_role 
CHECK (who_is_role IN ('', 'bridal_party', 'father', 'mother', 'brother', 'sister', 'cousin', 'uncle', 'aunty', 'guest', 'vendor'));