-- Drop the existing constraint that blocks table deletion
ALTER TABLE ai_seating_suggestions 
  DROP CONSTRAINT IF EXISTS ai_seating_suggestions_suggested_table_id_fkey;

-- Re-add with ON DELETE CASCADE so suggestions are auto-deleted when table is deleted
ALTER TABLE ai_seating_suggestions 
  ADD CONSTRAINT ai_seating_suggestions_suggested_table_id_fkey 
  FOREIGN KEY (suggested_table_id) REFERENCES tables(id) ON DELETE CASCADE;