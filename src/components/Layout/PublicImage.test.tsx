import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicImage, publicImageUrl } from './PublicImage';

afterEach(() => vi.unstubAllEnvs());

describe('public marketing image delivery', () => {
  it('offers responsive local variants while preserving alt text and the original fallback', () => {
    vi.stubEnv('PROD', true);
    render(<PublicImage src="/photos/wedding table.jpg" alt="Reception table with flowers" loading="lazy" />);
    const img = screen.getByRole('img', { name: 'Reception table with flowers' });
    expect(img).toHaveAttribute('src', '/photos/wedding table.jpg');
    expect(img).toHaveAttribute('srcset', expect.stringContaining('480w'));
    expect(img).toHaveAttribute('srcset', expect.stringContaining('1280w'));
    expect(publicImageUrl('/photos/wedding table.jpg', 800)).toContain('url=%2Fphotos%2Fwedding%20table.jpg');
    fireEvent.error(img);
    expect(img).not.toHaveAttribute('srcset');
    expect(img).toHaveAttribute('src', '/photos/wedding table.jpg');
  });

  it('does not route remote or private images through the public optimizer', () => {
    vi.stubEnv('PROD', true);
    render(<PublicImage src="https://example.com/photo.jpg" alt="External photo" />);
    expect(screen.getByRole('img')).not.toHaveAttribute('srcset');
  });
});
