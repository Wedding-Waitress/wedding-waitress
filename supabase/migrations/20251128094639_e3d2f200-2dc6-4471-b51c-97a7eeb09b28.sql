-- Fix duplicate venue-logos storage policies
-- Drop the OLD insecure policies that were not dropped in the previous migration
-- because the policy names were incorrect

DROP POLICY IF EXISTS "Users can delete their venue logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their venue logos" ON storage.objects;

-- The secure policies already exist from the previous migration:
-- "Users can delete their own venue logos" (with ownership check)
-- "Users can update their own venue logos" (with ownership check)