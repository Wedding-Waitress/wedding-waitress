CREATE INDEX IF NOT EXISTS idx_event_referral_dismissals_event
  ON public.event_referral_dismissals(event_id);

CREATE INDEX IF NOT EXISTS idx_place_card_image_categories_category
  ON public.place_card_image_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_signage_image_categories_category
  ON public.signage_image_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_signage_settings_user
  ON public.signage_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_venue_floor_plan_templates_approved_by
  ON public.venue_floor_plan_templates(approved_by);
