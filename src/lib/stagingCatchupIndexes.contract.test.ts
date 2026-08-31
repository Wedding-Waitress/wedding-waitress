import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20260830270000_staging_catchup_fk_indexes.sql', 'utf8');

describe('staging catch-up foreign-key indexes', () => {
  it.each([
    'event_referral_dismissals(event_id)',
    'place_card_image_categories(category_id)',
    'signage_image_categories(category_id)',
    'signage_settings(user_id)',
    'venue_floor_plan_templates(approved_by)',
  ])('covers %s', (target) => {
    expect(sql).toContain(target);
  });
});
