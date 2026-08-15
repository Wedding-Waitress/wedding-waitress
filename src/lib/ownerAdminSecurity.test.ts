import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  OWNER_ADMIN_EMAIL,
  isOwnerAdminEmail,
  normalizeOwnerAdminEmail,
} from '../../supabase/functions/_shared/owner-admin';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('single owner/admin security boundary', () => {
  it('normalizes casing and whitespace while rejecting every other email', () => {
    expect(OWNER_ADMIN_EMAIL).toBe('naderelalfy1977@gmail.com');
    expect(normalizeOwnerAdminEmail('  NaderElalfy1977@GMAIL.COM  ')).toBe(OWNER_ADMIN_EMAIL);
    expect(isOwnerAdminEmail('  NaderElalfy1977@GMAIL.COM  ')).toBe(true);
    expect(isOwnerAdminEmail('nadaelalfi1977@gmail.com')).toBe(false);
    expect(isOwnerAdminEmail(undefined)).toBe(false);
  });

  it('guards the canonical role table and removes every other admin assignment', () => {
    const sql = read('supabase/migrations/20260815213000_enforce_single_owner_admin.sql');

    expect(sql).toContain("lower(btrim(email)) = 'naderelalfy1977@gmail.com'");
    expect(sql).toMatch(/IF owner_match_count <> 1/);
    expect(sql).toMatch(/DELETE FROM public\.user_roles[\s\S]*role = 'admin'[\s\S]*user_id <> owner_user_id/);
    expect(sql).toContain('CREATE TRIGGER enforce_owner_admin_role_trigger');
    expect(sql).toContain('Only the designated Wedding Waitress owner may hold the admin role');
    expect(sql).toMatch(/public\.can_access_event[\s\S]*public\.has_role\(_user_id, 'admin'/);
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
  });

  it('routes every normal admin interface through useIsAdmin', () => {
    const interfaceFiles = [
      'src/pages/Admin.tsx',
      'src/components/Dashboard/AppSidebar.tsx',
      'src/components/Dashboard/Invitations/InvitationGalleryModal.tsx',
      'src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx',
      'src/components/Dashboard/Signage/SignageGalleryModal.tsx',
      'src/components/Dashboard/PhotoVideoGallery/PhotoBoothTemplateLibraryDialog.tsx',
    ];

    for (const file of interfaceFiles) {
      expect(read(file), file).toContain('useIsAdmin');
    }
    expect(interfaceFiles.map(read).join('\n')).not.toContain('naderelalfy1977@gmail.com');
    expect(interfaceFiles.map(read).join('\n')).not.toContain('useIsOwnerAdmin');
  });

  it('authorizes privileged edge functions through is_owner_admin before elevation', () => {
    const functions = [
      'supabase/functions/admin-manage-subscription/index.ts',
      'supabase/functions/admin-send-otp/index.ts',
      'supabase/functions/admin-verify-otp/index.ts',
      'supabase/functions/optimize-signage-image/index.ts',
      'supabase/functions/purge-invitation-gallery/index.ts',
      'supabase/functions/purge-place-card-gallery/index.ts',
    ];

    for (const file of functions) {
      const source = read(file);
      expect(source, file).toMatch(/rpc\(["']is_owner_admin["']\)/);
      expect(source, file).not.toContain("from('user_roles')");
      expect(source, file).not.toContain('from("user_roles")');
    }
  });
});
