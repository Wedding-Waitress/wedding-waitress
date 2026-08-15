import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Photo Booth template library persistence security', () => {
  const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260815190000_add_photo_booth_template_library.sql'), 'utf8');

  it('allows public catalogue reads but protects every mutation with the existing admin role', () => {
    expect(sql).toContain('ALTER TABLE public.photo_booth_background_templates ENABLE ROW LEVEL SECURITY');
    expect(sql).toMatch(/FOR SELECT\s+USING \(true\)/);
    expect(sql.match(/public\.has_role\(auth\.uid\(\), 'admin'::app_role\)/g)).toHaveLength(8);
    expect(sql).toContain('FOR INSERT TO authenticated');
    expect(sql).toContain('FOR UPDATE TO authenticated');
    expect(sql).toContain('FOR DELETE TO authenticated');
    expect(sql).toContain('GRANT SELECT ON TABLE public.photo_booth_background_templates TO anon, authenticated');
    expect(sql).toContain('GRANT INSERT, UPDATE, DELETE ON TABLE public.photo_booth_background_templates TO authenticated');
    expect(sql).not.toMatch(/@|email/i);
  });

  it('uses a dedicated public bucket with JPG and PNG support without touching event media storage', () => {
    expect(sql).toContain("'photo-booth-template-library'");
    expect(sql).toContain("ARRAY['image/jpeg', 'image/png']");
    expect(sql).not.toContain('event-media');
    expect(sql).not.toContain('event_media_items');
  });
});
