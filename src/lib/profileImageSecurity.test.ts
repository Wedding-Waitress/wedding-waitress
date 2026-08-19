import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260818163500_add_secure_profile_images.sql'), 'utf8');
const dialogCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Account/AccountDialog.module.css'), 'utf8');
const dialogSources = [
  'EditDetailsModal.tsx',
  'ComingSoonSheet.tsx',
  'ChangePasswordModal.tsx',
].map((file) => fs.readFileSync(path.resolve(process.cwd(), 'src/components/Account', file), 'utf8'));

describe('profile image storage and Account Centre dialog safeguards', () => {
  it('creates a private size-limited image bucket with exact owner-path CRUD policies', () => {
    expect(migration).toContain("'profile-images'");
    expect(migration).toContain('false');
    expect(migration).toContain('5242880');
    expect(migration).toContain("ARRAY['image/jpeg', 'image/png', 'image/webp']");
    expect(migration.match(/name = auth\.uid\(\)::text \|\| '\/profile-image'/g)).toHaveLength(5);
    expect(migration).not.toContain('storage.foldername(name)');
    expect(migration).toContain("profile_image_path = id::text || '/profile-image'");
  });

  it('defines dark fields, mobile overflow protection and reduced-motion handling for dialogs', () => {
    expect(dialogCss).toContain('background: radial-gradient');
    expect(dialogCss).toContain('overflow-y: auto');
    expect(dialogCss).toContain('min-height: 46px');
    expect(dialogCss).toContain('@media (max-width: 767px)');
    expect(dialogCss).toContain('@media (prefers-reduced-motion: reduce)');
    dialogSources.forEach((source) => expect(source).toContain('data-appearance="espresso-glass"'));
  });
});
