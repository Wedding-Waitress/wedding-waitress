-- Guided Event Setup. This migration is intentionally local-only until an
-- operator explicitly approves and applies it to the target Supabase project.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Composite candidate keys let both optional relationships enforce tenant
-- ownership without a privileged trigger or user-editable JWT metadata.
ALTER TABLE public.events
  ADD CONSTRAINT events_id_user_id_key UNIQUE (id, user_id);

CREATE TABLE public.onboarding_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'first_event' CHECK (mode IN ('first_event', 'additional_event')),
  current_step smallint NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 10),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  created_event_id uuid,
  creation_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_drafts_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT onboarding_drafts_created_event_owner_fkey
    FOREIGN KEY (created_event_id, user_id)
    REFERENCES public.events(id, user_id)
    ON DELETE SET NULL (created_event_id)
);

CREATE UNIQUE INDEX onboarding_drafts_one_active_mode_idx
  ON public.onboarding_drafts(user_id, mode)
  WHERE completed_at IS NULL;
CREATE INDEX onboarding_drafts_user_id_idx ON public.onboarding_drafts(user_id);
CREATE INDEX onboarding_drafts_created_event_id_idx ON public.onboarding_drafts(created_event_id)
  WHERE created_event_id IS NOT NULL;

CREATE TRIGGER update_onboarding_drafts_updated_at
BEFORE UPDATE ON public.onboarding_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.onboarding_drafts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.onboarding_drafts TO authenticated;

CREATE POLICY "Customers read their onboarding drafts"
ON public.onboarding_drafts FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Customers create their onboarding drafts"
ON public.onboarding_drafts FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Customers update their onboarding drafts"
ON public.onboarding_drafts FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.events
  ADD COLUMN onboarding_draft_id uuid,
  ADD COLUMN setup_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(setup_details) = 'object');

ALTER TABLE public.events
  ADD CONSTRAINT events_onboarding_draft_owner_fkey
  FOREIGN KEY (onboarding_draft_id, user_id)
  REFERENCES public.onboarding_drafts(id, user_id)
  ON DELETE SET NULL (onboarding_draft_id);

CREATE UNIQUE INDEX events_onboarding_draft_id_uidx
  ON public.events(onboarding_draft_id)
  WHERE onboarding_draft_id IS NOT NULL;

ALTER TABLE public.event_budget_settings
  ADD COLUMN planned_budget_kind text NOT NULL DEFAULT 'exact'
    CHECK (planned_budget_kind IN ('exact', 'range', 'undecided')),
  ADD COLUMN planned_budget_range text;

ALTER TABLE public.event_budget_settings
  ADD CONSTRAINT event_budget_settings_range_state_check CHECK (
    (planned_budget_kind = 'range' AND nullif(btrim(planned_budget_range), '') IS NOT NULL)
    OR (planned_budget_kind <> 'range' AND planned_budget_range IS NULL)
  );

COMMENT ON TABLE public.onboarding_drafts IS
  'Owner-only resumable Guided Event Setup state. Event records are created only after Step 9 confirmation.';
COMMENT ON COLUMN public.events.setup_details IS
  'Non-operational Guided Event Setup metadata such as celebration type, date precision, locations and guest estimates.';
COMMENT ON COLUMN public.events.onboarding_draft_id IS
  'Idempotency key linking an event to the onboarding draft that created it.';
COMMENT ON COLUMN public.event_budget_settings.planned_budget_kind IS
  'Preserves whether the overall planned budget is exact, an approximate range, or undecided.';

NOTIFY pgrst, 'reload schema';

COMMIT;
