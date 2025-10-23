-- Add acknowledgment tracking to dj_questionnaires
ALTER TABLE dj_questionnaires
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
ADD COLUMN IF NOT EXISTS approved_from_ip INET;

-- Create acknowledgment log table for audit trail
CREATE TABLE IF NOT EXISTS dj_questionnaire_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES dj_questionnaires(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_by_name TEXT,
  acknowledged_from_ip INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dj_acknowledgments_questionnaire 
ON dj_questionnaire_acknowledgments(questionnaire_id);

-- RLS: Public can insert acknowledgments for valid tokens
ALTER TABLE dj_questionnaire_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create acknowledgments for valid tokens"
ON dj_questionnaire_acknowledgments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM dj_questionnaires q
    WHERE q.id = questionnaire_id 
    AND q.share_token IS NOT NULL
  )
);

-- Event owners can view acknowledgments
CREATE POLICY "Event owners can view acknowledgments"
ON dj_questionnaire_acknowledgments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM dj_questionnaires q
    JOIN events e ON e.id = q.event_id
    WHERE q.id = questionnaire_id 
    AND e.user_id = auth.uid()
  )
);

-- Public function to fetch questionnaire by token (no auth required)
CREATE OR REPLACE FUNCTION public.get_questionnaire_by_token(
  _share_token TEXT
)
RETURNS TABLE(
  questionnaire_id UUID,
  event_id UUID,
  event_name TEXT,
  event_date DATE,
  template_type TEXT,
  status TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by_name TEXT,
  header_overrides JSONB,
  section_id UUID,
  section_label TEXT,
  section_sort_index INTEGER,
  item_id UUID,
  item_type TEXT,
  item_prompt TEXT,
  item_sort_index INTEGER,
  answer_value JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    q.id as questionnaire_id,
    q.event_id,
    e.name as event_name,
    e.date as event_date,
    q.template_type,
    q.status,
    q.approved_at,
    q.approved_by_name,
    q.header_overrides,
    s.id as section_id,
    s.label as section_label,
    s.sort_index as section_sort_index,
    i.id as item_id,
    i.type as item_type,
    i.prompt as item_prompt,
    i.sort_index as item_sort_index,
    a.value as answer_value
  FROM dj_questionnaires q
  JOIN events e ON e.id = q.event_id
  LEFT JOIN dj_sections s ON s.questionnaire_id = q.id
  LEFT JOIN dj_items i ON i.section_id = s.id
  LEFT JOIN dj_answers a ON a.item_id = i.id
  WHERE q.share_token = _share_token
  ORDER BY s.sort_index, i.sort_index;
$$;