import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardInterfaceStyleScope } from './DashboardInterfaceStyleScope';

afterEach(cleanup);
describe('dashboard interface route boundary', () => {
  it.each(['/dashboard?tab=guest-list', '/account/account-info', '/admin/overview'])(
    'includes the authenticated interface at %s', route => {
      render(<MemoryRouter initialEntries={[route]}><DashboardInterfaceStyleScope /></MemoryRouter>);
      expect(document.body).toHaveAttribute('data-ww-dashboard-ui', 'true');
    },
  );
  it.each(['/', '/guest/123', '/account-recovery', '/gallery/123', '/shared-running-sheet/123'])(
    'leaves the public or shared destination %s unchanged', route => {
      render(<MemoryRouter initialEntries={[route]}><DashboardInterfaceStyleScope /></MemoryRouter>);
      expect(document.body).not.toHaveAttribute('data-ww-dashboard-ui');
    },
  );
  it('removes the visual scope when the authenticated interface unmounts', () => {
    const view = render(<MemoryRouter initialEntries={['/dashboard']}><DashboardInterfaceStyleScope /></MemoryRouter>);
    view.unmount();
    expect(document.body).not.toHaveAttribute('data-ww-dashboard-ui');
  });
});
