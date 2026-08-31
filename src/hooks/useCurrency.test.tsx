import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCurrency } from './useCurrency';

describe('saved pricing currency', () => {
  beforeEach(() => localStorage.clear());

  it('defaults missing and invalid preferences to AUD', () => {
    localStorage.setItem('ww_currency', 'CAD');
    const { result } = renderHook(() => useCurrency());
    expect(result.current.currency).toBe('AUD');
  });

  it('persists a supported selection', () => {
    const { result } = renderHook(() => useCurrency());
    act(() => result.current.setCurrency('EUR'));
    expect(localStorage.getItem('ww_currency')).toBe('EUR');
  });
});
