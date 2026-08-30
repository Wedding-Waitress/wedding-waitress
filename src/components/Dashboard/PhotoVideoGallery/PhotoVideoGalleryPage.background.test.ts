import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Photo & Video Sharing landing background coverage', () => {
  it('keeps the protected workspace surface and adds a landing-only light surface', () => {
    const dashboard = read('src/pages/Dashboard.tsx');
    const page = read('src/components/Dashboard/PhotoVideoGallery/PhotoVideoGalleryPage.tsx');
    const managementCss = read('src/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css');
    const landingCss = read('src/components/Dashboard/PhotoVideoGallery/PhotoVideoGalleryLanding.module.css');
    const applicationCss = read('src/index.css');

    expect(dashboard).toContain("isPhotoVideoWorkspace || activeTab === 'photo-video-gallery'");
    expect(page).toContain('managementStyles.photoVideoLandingContent');
    expect(page).toContain('styles.page');
    expect(page).toContain('data-photo-video-landing');
    expect(page).not.toContain('-m-4');
    expect(page).not.toContain('sm:-m-6');
    expect(managementCss).toContain('.photoVideoLandingContent');
    expect(managementCss).toContain('env(safe-area-inset-left)');
    expect(managementCss).toContain('env(safe-area-inset-right)');
    expect(managementCss).toContain('env(safe-area-inset-bottom)');
    expect(managementCss).toContain('background-image: var(--ww-application-background-image)');
    expect(landingCss).toContain('--landing-workspace: #f4eadb');
    expect(landingCss).toContain('min-height: 100dvh');
    expect(applicationCss).toContain('--ww-application-background-color: #120806');
    expect(applicationCss).toContain('.ww-application-background');
  });
});
