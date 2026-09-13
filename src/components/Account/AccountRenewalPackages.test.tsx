import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { AccountRenewalPackages } from './AccountRenewalPackages';

it('offers exactly the three existing packages and preserves the disabled checkout safety gate', () => {
  render(<MemoryRouter><AccountRenewalPackages /></MemoryRouter>);
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(screen.getByRole('radio', { name: /Essential Plan.*A\$199/ })).toBeChecked();
  expect(screen.getByRole('radio', { name: /Premium Plan.*A\$249/ })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /Ultimate Plan.*A\$299/ })).toBeInTheDocument();
  expect(screen.queryByText(/Vendor Pro/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('checkbox')).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: /Ultimate Plan/ }));
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'Continue to renewal checkout' })).toBeDisabled();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('No payment will be taken');
});
