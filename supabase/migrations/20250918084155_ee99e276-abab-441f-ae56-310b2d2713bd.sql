-- Rename "Who Is" columns to "Relation" columns in guests table
ALTER TABLE public.guests RENAME COLUMN who_is_partner TO relation_partner;
ALTER TABLE public.guests RENAME COLUMN who_is_role TO relation_role;
ALTER TABLE public.guests RENAME COLUMN who_is_display TO relation_display;

-- Rename "Who Is" columns to "Relation" columns in events table
ALTER TABLE public.events RENAME COLUMN who_is_required TO relation_required;
ALTER TABLE public.events RENAME COLUMN who_is_allow_custom_role TO relation_allow_custom_role;
ALTER TABLE public.events RENAME COLUMN who_is_allow_single_partner TO relation_allow_single_partner;
ALTER TABLE public.events RENAME COLUMN who_is_disable_first_guest_alert TO relation_disable_first_guest_alert;