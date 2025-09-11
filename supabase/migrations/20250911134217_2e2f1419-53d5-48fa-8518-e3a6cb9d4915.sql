-- Add partner name columns to events table
ALTER TABLE public.events 
ADD COLUMN partner1_name text,
ADD COLUMN partner2_name text;

-- Add relation columns to guests table with CHECK constraints
ALTER TABLE public.guests 
ADD COLUMN relation_person1 text CHECK (relation_person1 IN ('None','Bridal Party','Father','Mother','Brother','Sister','Cousin','Aunty','Uncle','Guest','Vendor')),
ADD COLUMN relation_person2 text CHECK (relation_person2 IN ('None','Bridal Party','Father','Mother','Brother','Sister','Cousin','Aunty','Uncle','Guest','Vendor'));