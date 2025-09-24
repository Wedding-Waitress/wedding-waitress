-- First, identify and nullify duplicate seat assignments, keeping only the first guest for each seat
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY event_id, table_id, seat_no ORDER BY created_at) as row_num
  FROM guests 
  WHERE seat_no IS NOT NULL
)
UPDATE guests 
SET seat_no = NULL
FROM duplicates 
WHERE guests.id = duplicates.id 
AND duplicates.row_num > 1;

-- Now create the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS uniq_event_table_seat
ON guests (event_id, table_id, seat_no)
WHERE seat_no IS NOT NULL;