import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const componentSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/DashboardOverview.tsx'), 'utf8');
const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/DashboardOverview.module.css'), 'utf8');

describe('Dashboard overview responsive layout contract', () => {
  it('reuses the full-width Dashboard page wrapper instead of a narrow local maximum', () => {
    expect(componentSource).toContain('w-full max-w-none');
    expect(componentSource).not.toContain('max-w-6xl mx-auto');
  });

  it('uses content-width breakpoints for one, two, three and six columns', () => {
    expect(cssSource).toContain('.cardGrid { display: grid; grid-template-columns: minmax(0,1fr);');
    expect(cssSource).toMatch(/container: dashboard-overview \/ inline-size/);
    expect(cssSource).toMatch(/@container dashboard-overview \(min-width: 44rem\)[\s\S]*repeat\(2,minmax\(0,1fr\)\)/);
    expect(cssSource).toMatch(/@container dashboard-overview \(min-width: 70rem\)[\s\S]*repeat\(3,minmax\(0,1fr\)\)/);
    expect(cssSource).toMatch(/@container dashboard-overview \(min-width: 96rem\)[\s\S]*repeat\(6,minmax\(0,1fr\)\)/);
  });

  it('contains the overview heading, subtitle and six cards in a matching parent panel', () => {
    expect(componentSource).toContain('<section className={styles.overviewPanel} aria-labelledby="dashboard-overview-heading">');
    expect(componentSource.indexOf('className={styles.overviewPanel}')).toBeLessThan(componentSource.indexOf('className={styles.cardGrid}'));
    expect(cssSource).toMatch(/\.overviewPanel \{[^}]*border: 1px solid var\(--dashboard-border\);[^}]*background: var\(--dashboard-panel\);[^}]*box-shadow:/);
    const orderedCards = ['>Event Overview</h2>', '>Tables &amp; Seating</h2>', '>Guest List</h2>', '>Dietary Requirements</h2>', '>Needs Attention</h2>', '>Wedding Setup Progress</h2>'];
    orderedCards.reduce((position, card) => { const next = componentSource.indexOf(card); expect(next).toBeGreaterThan(position); return next; }, -1);
  });

  it('scopes the approved light palette to the Dashboard main surface', () => {
    expect(cssSource).toMatch(/\.mainSurface \{[^}]*--dashboard-workspace: #f2e9dc/);
    expect(cssSource).toMatch(/\.mainSurface \{[^}]*background-color: var\(--dashboard-workspace\) !important/);
    expect(cssSource).toMatch(/\.introduction h2[^}]*color: var\(--dashboard-text\) !important/);
    expect(cssSource).toMatch(/\.overviewCard \.cardHeading h2[^}]*color: var\(--dashboard-text\) !important/);
  });

  it('keeps the no-selection text readable and unrestricted on wider screens', () => {
    expect(componentSource).toContain('className={styles.eventValueText}');
    expect(cssSource).toMatch(/\.eventValueText[^}]*color: var\(--dashboard-text\) !important/);
    expect(cssSource).toMatch(/\.emptyState h2[^}]*color: var\(--dashboard-text\) !important/);
    expect(cssSource).toMatch(/\.selectionEmptyState p[^}]*max-width: none/);
    expect(componentSource).toContain('Select an event above to see its latest guest, seating and dietary progress, plus QR code readiness.');
  });

  it('uses compact centred card actions with a real Lucide chevron', () => {
    expect(componentSource).toContain('<ChevronRight size={14} strokeWidth={1.8} aria-hidden="true" />');
    expect(componentSource).not.toMatch(/<span>\s*&gt;\s*<\/span>|['"]>['"]/);
    expect(cssSource).toMatch(/\.overviewCard \.cardAction \{[^}]*min-height: 2rem;[^}]*justify-content: center;[^}]*margin: auto auto 0;[^}]*padding: 0 \.65rem;/);
    expect(cssSource).toMatch(/\.overviewCard \.cardAction \{[^}]*font-size: 12px;[^}]*font-weight: 500;[^}]*white-space: nowrap;/);
  });

  it('uses strong semantic treatments and white icons on solid green and red states', () => {
    expect(cssSource).toContain('linear-gradient(180deg, #4ade80 0%, #22c55e 58%, #16a34a 100%)');
    expect(cssSource).toContain('linear-gradient(180deg, #f87171 0%, #ef4444 58%, #dc2626 100%)');
    expect(cssSource).toContain('linear-gradient(180deg, #fb923c 0%, #f97316 18%, #c2410c 42%, #9a3412 100%)');
    expect(cssSource).toContain('linear-gradient(180deg, #60a5fa 0%, #3b82f6 58%, #2563eb 100%)');
    expect(cssSource).toMatch(/\.errorState svg \{[^}]*color: #FFFFFF/);
    expect(cssSource).toMatch(/data-complete="false"\] button \{[^}]*color: #FFFFFF !important;[^}]*border: 0 !important/);
    expect(cssSource).toMatch(/data-complete="true"\] button \{[^}]*color: #FFFFFF !important;[^}]*border: 0 !important/);
    expect(cssSource).toMatch(/\.setupList button \{[^}]*border: 0;/);
    expect(cssSource).not.toMatch(/data-complete="(?:false|true)"\] button \{[^}]*border:\s*1px/);
    expect(cssSource).toMatch(/data-complete="false"\] button > svg, \.setupList li\[data-complete="true"\] button > svg \{[^}]*color: #FFFFFF/);
    expect(cssSource).toMatch(/data-complete="false"\] \.stepMarker \{[^}]*color: #FFFFFF;[^}]*background: #c2410c/);
    expect(cssSource).toMatch(/data-complete="true"\] \.stepMarker svg \{[^}]*color: #FFFFFF/);
  });

  it('keeps visible Dashboard text and icons fully opaque', () => {
    expect(cssSource).toMatch(/--dashboard-text: #2b1711/);
    expect(cssSource).toMatch(/--dashboard-text-soft: #684b40/);
    expect(cssSource).toMatch(/--dashboard-gold-strong: #806344/);
    expect(cssSource).toMatch(/\.overview :is\(h1,h2,p,span,strong,small,dt,dd,label,button,svg\) \{ opacity: 1; \}/);
    expect(cssSource).not.toMatch(/color:\s*(?:rgba\([^)]*,\s*0?\.[0-9]+\)|color-mix\(|#[0-9a-fA-F]{8})/);
    expect(cssSource).toMatch(/\.emptyState > svg \{ color: var\(--dashboard-gold-strong\); \}/);
  });

  it('uses the approved QR red treatment for warning badges and crisp secondary card actions', () => {
    expect(componentSource).toContain('className={styles.attentionBadge}');
    expect(cssSource).toMatch(/\.attentionBadge \{[^}]*border: 0;[^}]*color: #FFFFFF;[^}]*background: linear-gradient\(180deg, #f87171 0%, #ef4444 58%, #dc2626 100%\)/);
    expect(cssSource).toMatch(/\.attentionList \.attentionBadge svg \{ color: #FFFFFF; opacity: 1; \}/);
    expect(cssSource).toMatch(/\.overviewCard \.cardAction \{[^}]*border: 1px solid var\(--dashboard-gold-strong\) !important;[^}]*color: var\(--dashboard-gold-strong\) !important/);
    expect(cssSource).toMatch(/\.overviewCard \.cardAction svg \{[^}]*color: var\(--dashboard-gold-strong\) !important; opacity: 1;/);
  });
});
