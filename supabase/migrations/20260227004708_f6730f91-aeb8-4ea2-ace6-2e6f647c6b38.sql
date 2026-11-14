INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('dc3b869a-e795-404d-b477-64f882e3b7cf', 'admin', 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa')
ON CONFLICT (user_id, role) DO NOTHING;