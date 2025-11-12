-- Drop the existing constraint that blocks custom roles
ALTER TABLE guests DROP CONSTRAINT IF EXISTS check_who_is_role;

-- Add a new constraint that allows standard roles AND custom roles (custom_*)
ALTER TABLE guests ADD CONSTRAINT check_who_is_role 
CHECK (
  relation_role = '' OR
  relation_role IN ('bridal_party', 'father', 'mother', 'brother', 'sister', 'cousin', 'uncle', 'aunty', 'guest', 'vendor') OR
  relation_role LIKE 'custom_%'
);