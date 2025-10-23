-- Create DJ Questionnaire Responses table
CREATE TABLE public.dj_questionnaire_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('wedding_mr_mrs', 'wedding_mr_mr', 'wedding_mrs_mrs', 'events')),
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dj_questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own questionnaire responses"
  ON public.dj_questionnaire_responses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own questionnaire responses"
  ON public.dj_questionnaire_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questionnaire responses"
  ON public.dj_questionnaire_responses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questionnaire responses"
  ON public.dj_questionnaire_responses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_dj_questionnaire_responses_updated_at
  BEFORE UPDATE ON public.dj_questionnaire_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();