import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
describe('Admin Centre dashboard visual parity', () => {
  it('reuses the authoritative dashboard theme for content and verification', () => {
    for (const path of ['./AdminCentrePages.module.css', './AdminOtpModal.module.css', '../../pages/Admin.module.css']) {
      const css = read(path);
      expect(css).toContain('composes: mainSurface from');
      expect(css).toContain('var(--dashboard-text)');
      expect(css).toContain('var(--dashboard-panel)');
    }
  });
  it('themes all operational dialog portals without changing global auth', () => {
    const source = read('./AdminCentrePages.tsx');
    const portals=source.match(/<DialogContent\b/g)||[];
    expect(portals.length).toBeGreaterThan(0);
    expect(source.match(/<DialogContent className={styles.dialog} overlayClassName={styles.overlay}>/g)).toHaveLength(portals.length);
    expect(read('./AdminCentrePages.module.css')).toContain('composes: dialog from "../Account/AccountDialog.module.css"');
  });
  it('retains navigation white text while removing the content-wide override', () => {
    const css = read('../../pages/Admin.module.css');
    expect(css).toContain('.adminCentre :is(.desktop,.drawer) :where');
    expect(css).not.toContain('.adminCentre :where');
    expect(read('./AdminCentrePages.module.css')).not.toContain('.page :where');
  });
  it('matches the approved Run Sheet header and row reference without changing schedule code',()=>{
    const css=read('./AdminCentrePages.module.css');
    for(const token of ['#d8bc91','linear-gradient(180deg,#f1e1c9,#ead6b8)','#e2ceb0','#fbf1e3','#f8ead7','#fff7eb','border-spacing:0 5px','font-size:13px'])expect(css).toContain(token);
    expect(read('./AdminOperationsPages.tsx')).toContain('overlayClassName={styles.overlay}');
  });
});
