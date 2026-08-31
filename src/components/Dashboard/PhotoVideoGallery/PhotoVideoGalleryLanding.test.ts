import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(
  path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery', file),
  'utf8',
);

describe('Photo & Video Sharing overview light theme', () => {
  it('uses a landing-only CSS module without changing protected workspace styling', () => {
    const page = read('PhotoVideoGalleryPage.tsx');
    const features = read('GalleryGuestFeaturesCard.tsx');
    const css = read('PhotoVideoGalleryLanding.module.css');

    expect(page).toContain('data-photo-video-landing');
    expect(page).toContain("./PhotoVideoGalleryLanding.module.css");
    expect(features).toContain("./PhotoVideoGalleryLanding.module.css");
    expect(css).not.toContain('.page *');
    expect(css).not.toContain(':global(#root)');
    expect(css).not.toContain('.workspaceContent');
  });

  it('keeps all five management routes and responsive grid stages', () => {
    const features = read('GalleryGuestFeaturesCard.tsx');
    const css = read('PhotoVideoGalleryLanding.module.css');
    const routes = [
      'photo-video-sharing',
      'gallery-view',
      'digital-guestbook',
      'digital-photo-booth',
      'live-slideshow',
    ];

    routes.forEach((route) => expect(features).toContain(`/dashboard/photo-video-gallery/${route}`));
    expect(css).toContain('container-name: photo-video-features');
    expect(css).toContain('@container photo-video-features (min-width: 28rem)');
    expect(css).toContain('@container photo-video-features (min-width: 44rem)');
    expect(css).toContain('@container photo-video-features (min-width: 84rem)');
    expect(css).toContain('overflow-x: hidden');
  });

  it('uses opaque light-theme text and explicit enabled and disabled switch treatments', () => {
    const css = read('PhotoVideoGalleryLanding.module.css');
    expect(css).toContain('--landing-espresso: #2f1b14');
    expect(css).toContain('--landing-brown: #65483a');
    expect(css).toContain("[data-state='checked']");
    expect(css).toContain('background: #a17c56 !important');
    expect(css).toContain('background: linear-gradient(180deg, #35d878 0%, #13ad56 100%) !important');
  });
});
