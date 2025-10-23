-- Phase 1: Security Foundation
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'collaborator', 'owner');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Phase 2: Collaborator System
CREATE TABLE public.event_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'collaborator' CHECK (role IN ('collaborator', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;

-- Security definer function to check event access
CREATE OR REPLACE FUNCTION public.can_access_event(_user_id UUID, _event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events WHERE id = _event_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.event_collaborators 
    WHERE event_id = _event_id AND user_id = _user_id
  )
$$;

-- RLS policies for event_collaborators
CREATE POLICY "Event owners and admins can manage collaborators"
  ON public.event_collaborators FOR ALL
  USING (
    public.can_access_event(auth.uid(), event_id)
  );

CREATE POLICY "Collaborators can view their access"
  ON public.event_collaborators FOR SELECT
  USING (auth.uid() = user_id);

-- Phase 3: DJ Questionnaire Restructure
-- Drop old table
DROP TABLE IF EXISTS public.dj_questionnaire_responses CASCADE;

-- Table 1: Main questionnaires
CREATE TABLE public.dj_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  template_type TEXT NOT NULL CHECK (
    template_type IN ('wedding_mr_mrs', 'wedding_mr_mr', 'wedding_mrs_mrs', 'event_general')
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'ready', 'sent', 'approved')
  ),
  recipient_emails TEXT[] DEFAULT '{}',
  notes TEXT,
  header_overrides JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id)
);

ALTER TABLE public.dj_questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view questionnaires"
  ON public.dj_questionnaires FOR SELECT
  USING (public.can_access_event(auth.uid(), event_id));

CREATE POLICY "Authorized users can create questionnaires"
  ON public.dj_questionnaires FOR INSERT
  WITH CHECK (
    public.can_access_event(auth.uid(), event_id) AND
    auth.uid() = created_by
  );

CREATE POLICY "Authorized users can update questionnaires"
  ON public.dj_questionnaires FOR UPDATE
  USING (public.can_access_event(auth.uid(), event_id));

CREATE POLICY "Authorized users can delete questionnaires"
  ON public.dj_questionnaires FOR DELETE
  USING (public.can_access_event(auth.uid(), event_id));

CREATE TRIGGER update_dj_questionnaires_updated_at
  BEFORE UPDATE ON public.dj_questionnaires
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table 2: Sections
CREATE TABLE public.dj_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID REFERENCES public.dj_questionnaires(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  instructions TEXT,
  recommendations JSONB DEFAULT '{}',
  sort_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dj_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view sections"
  ON public.dj_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dj_questionnaires q
      WHERE q.id = questionnaire_id
      AND public.can_access_event(auth.uid(), q.event_id)
    )
  );

CREATE POLICY "Authorized users can manage sections"
  ON public.dj_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.dj_questionnaires q
      WHERE q.id = questionnaire_id
      AND public.can_access_event(auth.uid(), q.event_id)
    )
  );

CREATE TRIGGER update_dj_sections_updated_at
  BEFORE UPDATE ON public.dj_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table 3: Items
CREATE TABLE public.dj_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.dj_sections(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('text', 'longtext', 'name', 'song', 'list', 'toggle', 'time', 'phone', 'email')
  ),
  prompt TEXT NOT NULL,
  help_text TEXT,
  required BOOLEAN DEFAULT false,
  sort_index INTEGER NOT NULL DEFAULT 0,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dj_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view items"
  ON public.dj_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dj_sections s
      JOIN public.dj_questionnaires q ON q.id = s.questionnaire_id
      WHERE s.id = section_id
      AND public.can_access_event(auth.uid(), q.event_id)
    )
  );

CREATE POLICY "Authorized users can manage items"
  ON public.dj_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.dj_sections s
      JOIN public.dj_questionnaires q ON q.id = s.questionnaire_id
      WHERE s.id = section_id
      AND public.can_access_event(auth.uid(), q.event_id)
    )
  );

CREATE TRIGGER update_dj_items_updated_at
  BEFORE UPDATE ON public.dj_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table 4: Answers
CREATE TABLE public.dj_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.dj_items(id) ON DELETE CASCADE NOT NULL,
  value JSONB NOT NULL,
  answered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (item_id)
);

ALTER TABLE public.dj_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view answers"
  ON public.dj_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dj_items i
      JOIN public.dj_sections s ON s.id = i.section_id
      JOIN public.dj_questionnaires q ON q.id = s.questionnaire_id
      WHERE i.id = item_id
      AND public.can_access_event(auth.uid(), q.event_id)
    )
  );

CREATE POLICY "Authorized users can manage answers"
  ON public.dj_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.dj_items i
      JOIN public.dj_sections s ON s.id = i.section_id
      JOIN public.dj_questionnaires q ON q.id = s.questionnaire_id
      WHERE i.id = item_id
      AND public.can_access_event(auth.uid(), q.event_id)
    )
  );

CREATE TRIGGER update_dj_answers_updated_at
  BEFORE UPDATE ON public.dj_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed admin user (existing bootstrap admin from adminConfig.ts)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('a0dba7aa-b67a-4856-8e7e-4af91d43d3fa', 'admin', 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa')
ON CONFLICT (user_id, role) DO NOTHING;