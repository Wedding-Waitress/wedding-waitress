import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

describe('Guest Live View module tray', () => {
  const page = readFileSync('src/pages/GuestLookup.tsx', 'utf8');
  const css = readFileSync('src/pages/GuestLookup.module.css', 'utf8');

  it('includes enabled song requests after the six established module positions', () => {
    expect(page).toContain('songRequestSettings?.enabled &&');
    expect(page).toContain('<span>Song Requests</span>');
    expect(page.indexOf('<span>Menu</span>')).toBeLessThan(page.indexOf('<span>Song Requests</span>'));
    expect(page).toContain('openSongRequests');
    expect(page).toContain('maxRequests={songRequestSettings?.enabled');
  });

  it('always renders the compact four-column tray regardless of enabled module count', () => {
    expect(page).toMatch(/data-module-density="compact"/);
    expect(page).toMatch(/<TabsList className=\{`\$\{styles\.moduleGrid\}[^`]*\bgrid-cols-4`\}/);
    expect(css).toContain('flex-direction: column');
    expect(css).toContain('min-height: 44px');
  });

  it.each([320, 340, 390, 768, 1440])('keeps four columns at %ipx after the CSS cascade', (width) => {
    const compactSelector = ':global(#root) .moduleTray[data-module-density="compact"] .moduleGrid';
    const candidates: { value: string; specificity: number; important: boolean }[] = [];
    postcss.parse(css).walkRules(rule => {
      if (rule.selector !== '.moduleGrid' && rule.selector !== compactSelector) return;
      // Include all matching rules in source order, including the late override
      // after the older narrow-screen fallback. Checking only for a declaration
      // would miss a later rule silently changing the rendered column count.
      let parent = rule.parent;
      while (parent && parent.type !== 'root') {
        if (parent.type === 'atrule' && parent.name === 'media') {
          const max = parent.params.match(/max-width:\s*(\d+)px/);
          const min = parent.params.match(/min-width:\s*(\d+)px/);
          if ((max && width > Number(max[1])) || (min && width < Number(min[1]))) return;
        }
        parent = parent.parent;
      }
      rule.walkDecls('grid-template-columns', declaration => {
        candidates.push({ value: declaration.value, specificity: rule.selector === compactSelector ? 4 : 1, important: Boolean(declaration.important) });
      });
    });
    const winner = candidates.reduce<typeof candidates[number] | undefined>((current, next) =>
      !current || Number(next.important) > Number(current.important) ||
      (next.important === current.important && next.specificity >= current.specificity) ? next : current, undefined);
    expect(winner?.value).toBe('repeat(4, minmax(0, 1fr))');
  });
  it('keeps the Welcome summary and verified inline editor above the footer without a launch button', () => {
    expect(page).toContain('<EnhancedGuestCard');
    expect(page).toContain('<GuestUpdateModal');
    expect(page).toContain('verification.verifiedFor(selectedGuest.id)');
    expect(page.indexOf('<EnhancedGuestCard')).toBeLessThan(page.indexOf('<GuestUpdateModal'));
    expect(page.indexOf('<GuestUpdateModal')).toBeLessThan(page.indexOf('Wedding Waitress Logo - Footer'));
    expect(page).not.toContain('RecipientUpdateDetailsAction');
    expect(page).not.toContain('Update My Details');
  });

  it('opens Song Requests as its own recipient-token modal', () => {
    expect(page).toContain('GuestSongRequestsModal');
    expect(page).toContain('setIsSongRequestsModalOpen(true)');
    const modal = readFileSync('src/components/GuestLookup/GuestSongRequestsModal.tsx', 'utf8');
    expect(modal).toContain('save_guest_invitation_song_requests');
    expect(modal).toContain('get_guest_invitation_song_requests');
    expect(modal).not.toContain('RSVP Status');
  });
});
