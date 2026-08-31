import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvitationCardCustomizer } from '../Invitations/InvitationCardCustomizer';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

afterEach(cleanup);

describe('Seating Chart Signs designer tabs', () => {
  it('opens the correct content and moves the active state across all four tabs', () => {
    render(
      <InvitationCardCustomizer
        settings={null}
        onSettingsChange={vi.fn().mockResolvedValue(true)}
        eventData={{}}
        appearance="signage-premium"
        headerTitle="QR Code Seating Chart & Wedding Sign Designer"
        textZonesIntro="Add text zones to your sign."
        qrTabTitle="Add QR Code to Sign"
      />,
    );

    const cases = [
      { name: 'Text Zones', content: 'Add text zones to your sign.' },
      { name: 'Background', content: 'Background Image' },
      { name: 'Add QR Code', content: 'Add QR Code to Sign' },
      { name: 'Messages', content: 'Notes / Caption' },
    ];

    for (const current of cases) {
      const tab = screen.getByRole('tab', { name: current.name });
      fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
      expect(tab).toHaveAttribute('data-state', 'active');
      expect(screen.getByText(current.content)).toBeVisible();

      for (const other of cases.filter((candidate) => candidate.name !== current.name)) {
        expect(screen.getByRole('tab', { name: other.name })).toHaveAttribute('data-state', 'inactive');
      }
    }
  });

  it('keeps one shared frame, inline icons, borderless inactive tabs, and the approved active treatment', () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/Dashboard/Signage/SignagePage.module.css'),
      'utf8',
    );

    expect(css).toMatch(/ww-signage-premium-designer\) \[role="tablist"\][^{]*\{[\s\S]*?display:\s*grid\s*!important;[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);[\s\S]*?padding:\s*0\.25rem\s*!important;[\s\S]*?border-radius:\s*999px\s*!important;/);
    expect(css).toMatch(/ww-signage-premium-designer\) \[role="tab"\][^{]*\{[\s\S]*?flex-direction:\s*row\s*!important;[\s\S]*?border:\s*0\s*!important;[\s\S]*?box-shadow:\s*none\s*!important;[\s\S]*?white-space:\s*nowrap\s*!important;/);
    expect(css).toMatch(/\[role="tab"\]\[data-state="active"\][^{]*\{[\s\S]*?background:\s*linear-gradient\(180deg, #15803d 0%, #166534 100%\)\s*!important;[\s\S]*?0 7px 16px rgba\(22, 101, 52, 0\.22\)\s*!important;/);
    expect(css).toMatch(/@media \(max-width: 480px\)[\s\S]*?ww-signage-premium-designer\) \[role="tab"\][^{]*\{[\s\S]*?min-height:\s*2\.75rem\s*!important;[\s\S]*?flex-direction:\s*row\s*!important;[\s\S]*?font-size:\s*clamp\(10px, 3vw, 13px\)\s*!important;/);
  });
});
