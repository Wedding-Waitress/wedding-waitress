import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingAudio } from './OnboardingAudio';

class FakeAudio {
  static instances: FakeAudio[] = [];
  currentTime = 0;
  preload = '';
  pause = vi.fn(() => this.listeners.pause?.());
  play = vi.fn(async () => { this.listeners.playing?.(); });
  private listeners: Record<string, (() => void) | undefined> = {};
  constructor(public src: string) { FakeAudio.instances.push(this); }
  addEventListener(name: string, callback: () => void) { this.listeners[name] = callback; }
}

describe('OnboardingAudio', () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal('Audio', FakeAudio);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('plays only after customer action and stops when the page changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'audio/mpeg' }) }));
    const view = render(<OnboardingAudio step={1} />);
    const listen = await screen.findByRole('button', { name: 'Listen to Wedding Waitress' });
    await waitFor(() => expect(listen).toBeEnabled());
    expect(FakeAudio.instances).toHaveLength(0);
    fireEvent.click(listen);
    await waitFor(() => expect(FakeAudio.instances[0].play).toHaveBeenCalledTimes(1));
    view.rerender(<OnboardingAudio step={2} />);
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
  });

  it('fails gracefully when narration has not been supplied', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, headers: new Headers() }));
    render(<OnboardingAudio step={1} />);
    expect(await screen.findByText('Narration coming soon. All instructions are shown below.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Listen to Wedding Waitress' })).toBeDisabled();
  });
});
