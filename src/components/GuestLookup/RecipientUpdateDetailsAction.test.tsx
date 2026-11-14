import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecipientUpdateDetailsAction } from './RecipientUpdateDetailsAction';

afterEach(cleanup);

describe('RecipientUpdateDetailsAction', () => {
  for (const width of [375, 768, 1024, 1440]) {
    it(`renders a visible, clickable ${width >= 768 ? 'desktop fallback' : 'mobile'} recipient update action at ${width}px`, () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      const onClick = vi.fn();
      render(<RecipientUpdateDetailsAction desktopOnly={width >= 768} onClick={onClick} />);
      const button = screen.getByRole('button', { name: 'Update My Details' });
      expect(button).toBeVisible();
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledOnce();
    });
  }
});
