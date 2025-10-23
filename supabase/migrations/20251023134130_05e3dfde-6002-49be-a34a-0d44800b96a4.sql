-- Add meta column to dj_questionnaires for section toggles
ALTER TABLE dj_questionnaires 
ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN dj_questionnaires.meta IS 
'Stores questionnaire-level settings including sectionVisibility toggles. Example: {"sectionVisibility": {"Ceremony Music": true, ...}}';

-- Update existing questionnaires with default visibility (all sections ON)
UPDATE dj_questionnaires
SET meta = jsonb_set(
  COALESCE(meta, '{}'::jsonb),
  '{sectionVisibility}',
  '{
    "Ceremony Music": true,
    "Bridal Party Introductions": true,
    "Speeches": true,
    "Main Event Songs": true,
    "Background / Dinner Music": true,
    "Dance Music": true,
    "Traditional / Multicultural Music": true,
    "Do not play songs": true
  }'::jsonb
)
WHERE meta IS NULL OR meta->'sectionVisibility' IS NULL;