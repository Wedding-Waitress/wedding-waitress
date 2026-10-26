INSERT INTO public.user_roles (user_id, role, created_by)
SELECT recipient.id, 'admin'::public.app_role, creator.id
FROM auth.users AS recipient
CROSS JOIN auth.users AS creator
WHERE recipient.id = 'dc3b869a-e795-404d-b477-64f882e3b7cf'
  AND creator.id = 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'
ON CONFLICT (user_id, role) DO NOTHING;
