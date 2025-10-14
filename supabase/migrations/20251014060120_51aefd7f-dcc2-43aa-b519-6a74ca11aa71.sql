-- Add seq_number column to media_uploads table
ALTER TABLE media_uploads 
ADD COLUMN IF NOT EXISTS seq_number INTEGER;

-- Add seq_number column to audio_guestbook table
ALTER TABLE audio_guestbook 
ADD COLUMN IF NOT EXISTS seq_number INTEGER;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_uploads_seq ON media_uploads(gallery_id, seq_number);
CREATE INDEX IF NOT EXISTS idx_audio_guestbook_seq ON audio_guestbook(gallery_id, seq_number);

-- Create database function for atomic counter increment
CREATE OR REPLACE FUNCTION get_next_media_seq_number(
  _gallery_id UUID,
  _table_name TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _next_seq INTEGER;
BEGIN
  -- Lock gallery row to prevent race conditions
  PERFORM 1 FROM galleries WHERE id = _gallery_id FOR UPDATE;
  
  -- Get max seq_number from specified table
  IF _table_name = 'media_uploads' THEN
    SELECT COALESCE(MAX(seq_number), 0) + 1 INTO _next_seq
    FROM media_uploads
    WHERE gallery_id = _gallery_id;
  ELSIF _table_name = 'audio_guestbook' THEN
    SELECT COALESCE(MAX(seq_number), 0) + 1 INTO _next_seq
    FROM audio_guestbook
    WHERE gallery_id = _gallery_id;
  ELSE
    RAISE EXCEPTION 'Invalid table name: %', _table_name;
  END IF;
  
  RETURN _next_seq;
END;
$$;

-- Backfill existing media_uploads records by created_at
WITH ranked AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY gallery_id ORDER BY created_at ASC) as seq
  FROM media_uploads
  WHERE seq_number IS NULL
)
UPDATE media_uploads m
SET seq_number = r.seq
FROM ranked r
WHERE m.id = r.id;

-- Backfill existing audio_guestbook records by created_at
WITH ranked AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY gallery_id ORDER BY created_at ASC) as seq
  FROM audio_guestbook
  WHERE seq_number IS NULL
)
UPDATE audio_guestbook a
SET seq_number = r.seq
FROM ranked r
WHERE a.id = r.id;