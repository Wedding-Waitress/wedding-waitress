-- Drop all DJ Questionnaire related tables (in order to respect foreign keys)
DROP TABLE IF EXISTS public.dj_questionnaire_acknowledgments CASCADE;
DROP TABLE IF EXISTS public.dj_questionnaire_tokens CASCADE;
DROP TABLE IF EXISTS public.dj_answers CASCADE;
DROP TABLE IF EXISTS public.dj_items CASCADE;
DROP TABLE IF EXISTS public.dj_sections CASCADE;
DROP TABLE IF EXISTS public.dj_questionnaires CASCADE;

-- Drop related function if exists
DROP FUNCTION IF EXISTS public.get_questionnaire_by_token(TEXT);