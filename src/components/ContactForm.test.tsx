import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactForm } from './ContactForm';

describe('ContactForm', () => {
  it('accepts an email address in the controlled email field', () => {
    render(<ContactForm />);

    const email = screen.getByLabelText(/email/i);
    fireEvent.change(email, { target: { value: 'qa.browser@example.com' } });

    expect(email).toHaveValue('qa.browser@example.com');
  });

  it('shows field-level validation without attempting to send a blank form', () => {
    render(<ContactForm />);

    fireEvent.click(screen.getByRole('button', { name: /contact\.sendButton/i }));

    expect(screen.getByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    expect(screen.getByText('Event type is required')).toBeInTheDocument();
    expect(screen.getByText('Message is required')).toBeInTheDocument();
  });
});
