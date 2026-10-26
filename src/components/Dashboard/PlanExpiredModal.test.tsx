import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { PlanExpiredModal } from './PlanExpiredModal';

it('lets an expired trial choose a current package with fresh consent and no automatic payment', () => {
  const onClose = vi.fn();
  render(<MemoryRouter><PlanExpiredModal isOpen onClose={onClose} /></MemoryRouter>);
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(screen.getByRole('radio', { name: /Essential Plan.*A\$199/ })).toBeChecked();
  expect(screen.getByRole('radio', { name: /Premium Plan.*A\$249/ })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /Ultimate Plan.*A\$299/ })).toBeInTheDocument();
  expect(screen.queryByText('Need more time?')).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue to renewal checkout' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('link', { name: 'Continue to renewal checkout' })).toHaveAttribute('href', '/account-renewal-checkout?plan=essential&purpose=renewal');
  fireEvent.click(screen.getByRole('radio', { name: /Premium Plan.*A\$249/ }));
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Maybe Later' }));
  expect(onClose).toHaveBeenCalled();
});
