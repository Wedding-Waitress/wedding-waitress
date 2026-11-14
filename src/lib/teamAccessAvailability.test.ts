import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const availability = readFileSync('src/lib/teamAccessAvailability.ts', 'utf8');
const accountCard = readFileSync('src/components/Account/AccountAccessCard.tsx', 'utf8');
const acceptPage = readFileSync('src/pages/AcceptTeamInvitation.tsx', 'utf8');

describe('Team access availability contract', () => {
  it('uses backend readiness rather than a silent frontend flag', () => {
    expect(availability).toContain("TEAM_ACCESS_ENABLED = true");
    expect(accountCard).toContain('disabled={!ready}');
    expect(accountCard).toContain('hasData ? team.members : profile');
    expect(accountCard).not.toContain('Team access is coming soon');
  });

  it('does not attempt invitation acceptance while unavailable', () => {
    expect(acceptPage).toContain('if (!TEAM_ACCESS_ENABLED) return;');
    expect(acceptPage).not.toContain("params.get('token')");
    expect(acceptPage).not.toContain("fragment.get('team_invitation')");
  });
});
