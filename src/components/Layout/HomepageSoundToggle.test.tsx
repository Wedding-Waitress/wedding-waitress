import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomepageSoundToggle } from './HomepageSoundToggle';
import { HomepageVideoProvider, useHomepageVideo } from './HomepageVideoContext';

vi.mock('@/i18n/usePublicCopy', () => ({ usePublicCopy: () => (text: string) => text }));

function Harness() {
  const control = useHomepageVideo()!;
  return <><HomepageSoundToggle /><video data-testid="movie" ref={control.registerVideo} autoPlay muted loop playsInline onCanPlay={control.syncPlayback} onPlaying={control.syncPlayback} onPause={control.syncPlayback} onVolumeChange={control.syncPlayback} onError={control.syncPlayback} /></>;
}
function setup() {
  const view = render(<HomepageVideoProvider><Harness /></HomepageVideoProvider>);
  const video = screen.getByTestId('movie') as HTMLVideoElement;
  let paused = false;
  Object.defineProperties(video, { readyState: { configurable: true, get: () => 4 }, paused: { configurable: true, get: () => paused } });
  const play = vi.spyOn(video, 'play').mockImplementation(async () => { paused = false; video.dispatchEvent(new Event('playing')); });
  const stop = vi.fn(() => { paused = true; });
  Object.defineProperty(video, 'pause', { configurable: true, value: stop });
  fireEvent.canPlay(video);
  return { video, play, stop, unmount: view.unmount, pause: () => { paused = true; fireEvent.pause(video); } };
}

describe('homepage header sound control', () => {
  it('is absent outside the homepage provider', () => {
    const { container } = render(<HomepageSoundToggle />);
    expect(container).toBeEmptyDOMElement();
  });
  it('starts muted and loops, with a named icon-only button and no pause control', () => {
    const { video } = setup();
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.autoplay).toBe(true);
    const button = screen.getByRole('button', { name: 'Turn sound on' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.textContent).toBe('');
    expect(button.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
  });
  it('toggles audio on and off without pausing the looping video', async () => {
    const { video, play } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Turn sound on' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mute sound' })).toHaveAttribute('aria-pressed', 'true'));
    expect(video.muted).toBe(false);
    expect(play).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Mute sound' }));
    expect(video.muted).toBe(true);
    expect(video.paused).toBe(false);
    expect(screen.getByRole('button', { name: 'Turn sound on' })).toHaveAttribute('aria-pressed', 'false');
  });
  it('keeps audio off when the browser rejects playback', async () => {
    const { video, play } = setup();
    play.mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Turn sound on' })));
    await waitFor(() => expect(video.muted).toBe(true));
    expect(screen.getByRole('button', { name: 'Turn sound on' })).toHaveAttribute('aria-pressed', 'false');
  });
  it('tracks a real pause or media error rather than reporting sound as active', async () => {
    const { video, pause } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Turn sound on' }));
    await screen.findByRole('button', { name: 'Mute sound' });
    pause();
    expect(screen.getByRole('button', { name: 'Turn sound on' })).toHaveAttribute('aria-pressed', 'false');
    Object.defineProperty(video, 'error', { configurable: true, value: { code: 3 } });
    fireEvent.error(video);
    expect(screen.getByRole('button', { name: 'Turn sound on' })).toBeDisabled();
  });
  it('stops and mutes the old video when leaving the homepage', async () => {
    const { video, stop, unmount } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Turn sound on' }));
    await screen.findByRole('button', { name: 'Mute sound' });
    unmount();
    expect(video.muted).toBe(true);
    expect(stop).toHaveBeenCalledOnce();
  });
});
