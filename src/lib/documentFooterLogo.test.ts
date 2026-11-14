import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DOCUMENT_FOOTER_LOGO_ASPECT_RATIO, fitDocumentFooterLogo } from './documentFooterLogo';

describe('approved dark-brown document footer logo', () => {
  it('preserves the exact supplied transparent PNG bytes', () => {
    const bytes = readFileSync('public/wedding-waitress-document-footer-dark-brown.png');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('986a888f5d828c6db7f1c18acc57299697d113e9352d8445e0e6077862effa70');
  });
  it.each([[42,12],[36,10],[35,10.5],[150,45],[132,40],[100,30]])(
    'contains the original aspect ratio inside the existing %s by %s footer box', (w,h) => {
      const fitted = fitDocumentFooterLogo(w,h);
      expect(fitted.width).toBeLessThanOrEqual(w);
      expect(fitted.height).toBeLessThanOrEqual(h);
      expect(fitted.width / fitted.height).toBeCloseTo(DOCUMENT_FOOTER_LOGO_ASPECT_RATIO, 8);
    },
  );
});
