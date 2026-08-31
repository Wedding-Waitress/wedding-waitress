-- Complete the authenticated Live View/Kiosk configuration schema in staging.
-- These columns exist in the generated client contract and historical
-- production migrations, but were absent from the recovered staging project.

ALTER TABLE public.live_view_module_settings
  ADD COLUMN IF NOT EXISTS floor_plan_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS menu_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hero_image_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reception_floor_plan_config jsonb DEFAULT '{}'::jsonb;

UPDATE public.live_view_module_settings
SET
  floor_plan_config = COALESCE(floor_plan_config, '{}'::jsonb),
  menu_config = COALESCE(menu_config, '{}'::jsonb),
  hero_image_config = COALESCE(hero_image_config, '{}'::jsonb),
  reception_floor_plan_config = COALESCE(reception_floor_plan_config, '{}'::jsonb)
WHERE floor_plan_config IS NULL
   OR menu_config IS NULL
   OR hero_image_config IS NULL
   OR reception_floor_plan_config IS NULL;

COMMENT ON COLUMN public.live_view_module_settings.floor_plan_config IS
  'Guest-facing ceremony floor plan configuration owned by the event organiser.';
COMMENT ON COLUMN public.live_view_module_settings.menu_config IS
  'Guest-facing event menu configuration owned by the event organiser.';
COMMENT ON COLUMN public.live_view_module_settings.hero_image_config IS
  'Guest-facing Live View hero image configuration owned by the event organiser.';
COMMENT ON COLUMN public.live_view_module_settings.reception_floor_plan_config IS
  'Guest-facing reception floor plan configuration, including an optional bearer share token.';
