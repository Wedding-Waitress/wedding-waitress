-- Transfer ownership of all user data to current authenticated user
-- From old user ID: d43c88c4-f8d8-48e2-92c7-e6db6e818b41
-- To current user ID: a0dba7aa-b67a-4856-8e7e-4af91d43d3fa

-- Update events ownership
UPDATE public.events 
SET user_id = 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'
WHERE user_id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41';

-- Update guests ownership
UPDATE public.guests 
SET user_id = 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'
WHERE user_id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41';

-- Update tables ownership
UPDATE public.tables 
SET user_id = 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'
WHERE user_id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41';

-- Update QR code settings ownership
UPDATE public.qr_code_settings 
SET user_id = 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'
WHERE user_id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41';

-- Update QR design presets ownership
UPDATE public.qr_design_presets 
SET user_id = 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'
WHERE user_id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41';

-- Update place card settings ownership
UPDATE public.place_card_settings 
SET user_id = 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'
WHERE user_id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41';

-- Update floor plans ownership
UPDATE public.floor_plans 
SET user_id = 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'
WHERE user_id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41';