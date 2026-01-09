-- =============================================
-- DJ-MC Questionnaire Tables
-- =============================================

-- Table: dj_mc_questionnaires (main questionnaire per event)
CREATE TABLE public.dj_mc_questionnaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dj_mc_questionnaires ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dj_mc_questionnaires
CREATE POLICY "Users can view their own questionnaires"
ON public.dj_mc_questionnaires FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own questionnaires"
ON public.dj_mc_questionnaires FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questionnaires"
ON public.dj_mc_questionnaires FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questionnaires"
ON public.dj_mc_questionnaires FOR DELETE
USING (auth.uid() = user_id);

-- Unique constraint: one questionnaire per event
CREATE UNIQUE INDEX idx_dj_mc_questionnaires_event_id ON public.dj_mc_questionnaires(event_id);

-- =============================================
-- Table: dj_mc_sections (9 sections per questionnaire)
-- =============================================
CREATE TABLE public.dj_mc_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  questionnaire_id UUID NOT NULL REFERENCES public.dj_mc_questionnaires(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL, -- ceremony, cocktail, introductions, speeches, main_event, dinner, dance, traditional, do_not_play
  section_label TEXT NOT NULL, -- Editable section title
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT, -- Section-specific notes for DJ
  is_collapsed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dj_mc_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dj_mc_sections
CREATE POLICY "Users can view their own sections"
ON public.dj_mc_sections FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.dj_mc_questionnaires q
  WHERE q.id = dj_mc_sections.questionnaire_id AND q.user_id = auth.uid()
));

CREATE POLICY "Users can create their own sections"
ON public.dj_mc_sections FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dj_mc_questionnaires q
  WHERE q.id = dj_mc_sections.questionnaire_id AND q.user_id = auth.uid()
));

CREATE POLICY "Users can update their own sections"
ON public.dj_mc_sections FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.dj_mc_questionnaires q
  WHERE q.id = dj_mc_sections.questionnaire_id AND q.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own sections"
ON public.dj_mc_sections FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.dj_mc_questionnaires q
  WHERE q.id = dj_mc_sections.questionnaire_id AND q.user_id = auth.uid()
));

-- =============================================
-- Table: dj_mc_items (rows within each section)
-- =============================================
CREATE TABLE public.dj_mc_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.dj_mc_sections(id) ON DELETE CASCADE,
  row_label TEXT NOT NULL, -- Left column label
  value_text TEXT, -- Right column value (name, song title, etc.)
  music_url TEXT, -- YouTube/Spotify link
  pronunciation_audio_url TEXT, -- For name pronunciation recordings
  duration TEXT, -- Optional song duration
  order_index INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false, -- Whether this is a template row
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dj_mc_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dj_mc_items
CREATE POLICY "Users can view their own items"
ON public.dj_mc_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.dj_mc_sections s
  JOIN public.dj_mc_questionnaires q ON q.id = s.questionnaire_id
  WHERE s.id = dj_mc_items.section_id AND q.user_id = auth.uid()
));

CREATE POLICY "Users can create their own items"
ON public.dj_mc_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dj_mc_sections s
  JOIN public.dj_mc_questionnaires q ON q.id = s.questionnaire_id
  WHERE s.id = dj_mc_items.section_id AND q.user_id = auth.uid()
));

CREATE POLICY "Users can update their own items"
ON public.dj_mc_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.dj_mc_sections s
  JOIN public.dj_mc_questionnaires q ON q.id = s.questionnaire_id
  WHERE s.id = dj_mc_items.section_id AND q.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own items"
ON public.dj_mc_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.dj_mc_sections s
  JOIN public.dj_mc_questionnaires q ON q.id = s.questionnaire_id
  WHERE s.id = dj_mc_items.section_id AND q.user_id = auth.uid()
));

-- =============================================
-- Table: dj_mc_share_tokens (for public sharing)
-- =============================================
CREATE TABLE public.dj_mc_share_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  questionnaire_id UUID NOT NULL REFERENCES public.dj_mc_questionnaires(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  permission TEXT NOT NULL DEFAULT 'view_only', -- view_only, can_edit
  recipient_name TEXT, -- Who this was shared with (e.g., "DJ Mark")
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.dj_mc_share_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dj_mc_share_tokens
CREATE POLICY "Users can view their own share tokens"
ON public.dj_mc_share_tokens FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.dj_mc_questionnaires q
  WHERE q.id = dj_mc_share_tokens.questionnaire_id AND q.user_id = auth.uid()
));

CREATE POLICY "Users can create share tokens"
ON public.dj_mc_share_tokens FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dj_mc_questionnaires q
  WHERE q.id = dj_mc_share_tokens.questionnaire_id AND q.user_id = auth.uid()
));

CREATE POLICY "Users can update their own share tokens"
ON public.dj_mc_share_tokens FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.dj_mc_questionnaires q
  WHERE q.id = dj_mc_share_tokens.questionnaire_id AND q.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own share tokens"
ON public.dj_mc_share_tokens FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.dj_mc_questionnaires q
  WHERE q.id = dj_mc_share_tokens.questionnaire_id AND q.user_id = auth.uid()
));

-- =============================================
-- RPC Function: Get questionnaire by share token (for public access)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_dj_mc_questionnaire_by_token(share_token TEXT)
RETURNS TABLE (
  questionnaire_id UUID,
  event_id UUID,
  event_name TEXT,
  event_date DATE,
  event_venue TEXT,
  permission TEXT,
  sections JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_record RECORD;
BEGIN
  -- Find and validate the token
  SELECT st.*, q.id as q_id, q.event_id as q_event_id
  INTO token_record
  FROM dj_mc_share_tokens st
  JOIN dj_mc_questionnaires q ON q.id = st.questionnaire_id
  WHERE st.token = share_token
    AND (st.expires_at IS NULL OR st.expires_at > now());
  
  IF token_record IS NULL THEN
    RETURN;
  END IF;
  
  -- Update last accessed
  UPDATE dj_mc_share_tokens SET last_accessed_at = now() WHERE token = share_token;
  
  -- Return questionnaire data with sections and items
  RETURN QUERY
  SELECT 
    token_record.q_id as questionnaire_id,
    e.id as event_id,
    e.name as event_name,
    e.date as event_date,
    e.venue as event_venue,
    token_record.permission,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'section_type', s.section_type,
          'section_label', s.section_label,
          'order_index', s.order_index,
          'notes', s.notes,
          'is_collapsed', s.is_collapsed,
          'items', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', i.id,
                'row_label', i.row_label,
                'value_text', i.value_text,
                'music_url', i.music_url,
                'pronunciation_audio_url', i.pronunciation_audio_url,
                'duration', i.duration,
                'order_index', i.order_index,
                'is_default', i.is_default
              ) ORDER BY i.order_index
            ), '[]'::jsonb)
            FROM dj_mc_items i
            WHERE i.section_id = s.id
          )
        ) ORDER BY s.order_index
      )
      FROM dj_mc_sections s
      WHERE s.questionnaire_id = token_record.q_id
    ) as sections
  FROM events e
  WHERE e.id = token_record.q_event_id;
END;
$$;

-- =============================================
-- RPC Function: Update item via share token (for public editing)
-- =============================================
CREATE OR REPLACE FUNCTION public.update_dj_mc_item_by_token(
  share_token TEXT,
  item_id UUID,
  new_value_text TEXT DEFAULT NULL,
  new_music_url TEXT DEFAULT NULL,
  new_row_label TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_record RECORD;
  item_record RECORD;
BEGIN
  -- Validate token and check permission
  SELECT st.*, q.id as q_id
  INTO token_record
  FROM dj_mc_share_tokens st
  JOIN dj_mc_questionnaires q ON q.id = st.questionnaire_id
  WHERE st.token = share_token
    AND st.permission = 'can_edit'
    AND (st.expires_at IS NULL OR st.expires_at > now());
  
  IF token_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify item belongs to this questionnaire
  SELECT i.* INTO item_record
  FROM dj_mc_items i
  JOIN dj_mc_sections s ON s.id = i.section_id
  WHERE i.id = item_id AND s.questionnaire_id = token_record.q_id;
  
  IF item_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update the item
  UPDATE dj_mc_items
  SET 
    value_text = COALESCE(new_value_text, value_text),
    music_url = COALESCE(new_music_url, music_url),
    row_label = COALESCE(new_row_label, row_label),
    updated_at = now()
  WHERE id = item_id;
  
  -- Update last accessed
  UPDATE dj_mc_share_tokens SET last_accessed_at = now() WHERE token = share_token;
  
  RETURN TRUE;
END;
$$;

-- =============================================
-- Function to generate share token
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_dj_mc_share_token(
  _questionnaire_id UUID,
  _permission TEXT DEFAULT 'view_only',
  _recipient_name TEXT DEFAULT NULL,
  _validity_days INTEGER DEFAULT 90
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  expires TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM dj_mc_questionnaires 
    WHERE id = _questionnaire_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Generate unique token
  new_token := encode(gen_random_bytes(24), 'base64');
  new_token := replace(replace(replace(new_token, '/', '_'), '+', '-'), '=', '');
  
  -- Calculate expiry
  IF _validity_days > 0 THEN
    expires := now() + (_validity_days || ' days')::interval;
  END IF;
  
  -- Insert token
  INSERT INTO dj_mc_share_tokens (questionnaire_id, token, permission, recipient_name, expires_at)
  VALUES (_questionnaire_id, new_token, _permission, _recipient_name, expires);
  
  RETURN new_token;
END;
$$;

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_dj_mc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_dj_mc_questionnaires_updated_at
BEFORE UPDATE ON public.dj_mc_questionnaires
FOR EACH ROW EXECUTE FUNCTION public.update_dj_mc_updated_at();

CREATE TRIGGER update_dj_mc_sections_updated_at
BEFORE UPDATE ON public.dj_mc_sections
FOR EACH ROW EXECUTE FUNCTION public.update_dj_mc_updated_at();

CREATE TRIGGER update_dj_mc_items_updated_at
BEFORE UPDATE ON public.dj_mc_items
FOR EACH ROW EXECUTE FUNCTION public.update_dj_mc_updated_at();