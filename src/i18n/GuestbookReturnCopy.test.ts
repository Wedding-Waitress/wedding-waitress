import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Guestbook return copy', () => {
  it('provides a localized return label for every shared-header language', () => {
    const header = fs.readFileSync('src/components/Layout/Header.tsx', 'utf8');
    const languages = [...new Set([...header.matchAll(/code:\s*'([a-z]{2})'/g)].map(match => match[1]))];
    for (const language of languages) {
      const copy = JSON.parse(fs.readFileSync(`src/i18n/locales/${language}/common.json`, 'utf8'));
      expect(copy.guestbookBackToApp, language).toBeTruthy();
      expect(copy.guestbookBackToApp, language).not.toMatch(/[?\uFFFD]/);
      if (language !== 'en') expect(copy.guestbookBackToApp, language).not.toBe('Back to App');
      for (const key of ['thankYou', 'another', 'return', 'received']) {
        expect(copy.guestbookSuccess[key], `${language}.${key}`).toBeTruthy();
        expect(copy.guestbookSuccess[key], `${language}.${key}`).not.toMatch(/[?\uFFFD]/);
      }
      expect(copy.guestbookSuccess.thankYou, language).toContain('{{name}}');
      const english = JSON.parse(fs.readFileSync('src/i18n/locales/en/common.json', 'utf8'));
      for (const key of ['intro', 'notice']) {
        expect(copy.guestbookPrivacy[key], `${language}.privacy.${key}`).toBeTruthy();
        expect(copy.guestbookPrivacy[key]).not.toMatch(/[?\uFFFD]/);
        if (language !== 'en') expect(copy.guestbookPrivacy[key]).not.toBe(english.guestbookPrivacy[key]);
      }
      for (const key of ['textTitle', 'audioTitle', 'videoTitle', 'textAgain', 'audioAgain', 'videoAgain', 'textSaved', 'audioSaved', 'videoSaved']) {
        expect(copy.guestbookMessages[key], `${language}.${key}`).toBeTruthy();
        expect(copy.guestbookMessages[key], `${language}.${key}`).not.toMatch(/[?\uFFFD]/);
        if (language !== 'en') expect(copy.guestbookMessages[key], `${language}.${key}`).not.toBe(english.guestbookMessages[key]);
      }
    }
    expect(fs.readFileSync('src/components/Dashboard/PhotoVideoGallery/GuestGuestbookTab.tsx', 'utf8')).toContain("t('guestbookBackToApp')");
  });
});
