import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminReadOnlyRunSheet } from './AdminReadOnlyRunSheet';

const spy = vi.hoisted(() => ({ renderer: vi.fn() }));
vi.mock('@/components/Dashboard/RunningSheet/RunningSheetSection', () => ({
  RunningSheetSection: (props: unknown) => { spy.renderer(props); return <div>Saved sheet renderer</div>; },
}));
describe('read-only saved Run Sheet adapter', () => {
  it('preserves an intentionally empty saved sheet without inserting default rows', async () => {
    render(<AdminReadOnlyRunSheet sheet={{ id: 'saved', label: '', notes: null, items: [] }} />);
    const props = spy.renderer.mock.lastCall![0];
    expect(props).toMatchObject({ label: '', notes: null, items: [], readOnly: true, allowReset: false });
    expect(props.onUpdateItem('row', { time_text: 'changed' })).toBeUndefined();
    expect(await props.onRestoreItems([])).toBeNull();
  });
  it('does not mount a renderer or create a sheet when none is saved', () => {
    spy.renderer.mockClear();
    render(<AdminReadOnlyRunSheet sheet={null} />);
    expect(screen.getByText('No saved Run Sheet recorded.')).toBeInTheDocument();
    expect(spy.renderer).not.toHaveBeenCalled();
  });
});
