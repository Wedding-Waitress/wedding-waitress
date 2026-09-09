import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationCardPreview } from './InvitationCardPreview';

describe('Signage paper preview zoom', () => {
  let resizeCallbacks: Array<() => void>;
  beforeEach(() => {
    resizeCallbacks = [];
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resizeCallbacks.push(callback); }
      observe() {} unobserve() {} disconnect() {}
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 1200, x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 1200, toJSON: () => ({}) });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('fits the editing width and does not undo button zoom after a height-only resize', () => {
    const documentRef = React.createRef<HTMLDivElement>();
    render(<InvitationCardPreview settings={null} eventData={{}} paperSize={{ widthMm: 594, heightMm: 841 }} documentRef={documentRef} fitToContainer backgroundFit="cover" />);
    expect(screen.getByText('35%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('45%')).toBeInTheDocument();
    act(() => { resizeCallbacks.forEach(callback => callback()); });
    expect(screen.getByText('45%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(documentRef.current?.style.width).toBe('594mm');
    expect(documentRef.current?.style.height).toBe('841mm');
  });
});
