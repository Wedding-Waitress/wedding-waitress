import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const productsSource = readFileSync('src/pages/Products.tsx', 'utf8');

describe('Products Photo & Video Sharing card image', () => {
  it('uses the existing photographic asset only for the Photo & Video Sharing card', () => {
    expect(productsSource).toContain(
      "const PHOTO_VIDEO_SHARING_CARD_IMAGE = '/images/public-heroes/photo-video-sharing.jpg';",
    );
    expect(productsSource).toContain(
      "product.id === 'photo-video-sharing' ? PHOTO_VIDEO_SHARING_CARD_IMAGE : product.image",
    );
  });

  it('preserves the shared card image geometry and crop', () => {
    expect(productsSource).toContain('className="aspect-[16/10] overflow-hidden bg-[#2b1711]"');
    expect(productsSource).toContain('className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"');
  });
});
