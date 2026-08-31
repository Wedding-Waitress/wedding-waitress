import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, 'DJMCQuestionnaireTheme.module.css'), 'utf8');
const pageSource = fs.readFileSync(path.resolve(__dirname, 'DJMCQuestionnairePage.tsx'), 'utf8');
const sectionSource = fs.readFileSync(path.resolve(__dirname, 'DJMCQuestionnaireSection.tsx'), 'utf8');
const shareSource = fs.readFileSync(path.resolve(__dirname, 'DJMCShareModal.tsx'), 'utf8');
const requestsSource = fs.readFileSync(path.resolve(__dirname, 'GuestSongRequestsSection.tsx'), 'utf8');
const publicSource = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/DJMCPublicView.tsx'), 'utf8');

describe('DJ/MC questionnaire visual contract', () => {
  it('owns a full-height scoped espresso dashboard and public surface', () => {
    expect(source).toContain(':global(.ww-djmc-shell)');
    expect(source).toContain(':global(.ww-djmc-main)');
    expect(source).toMatch(/\.publicPage\s*\{[^}]*min-height:\s*100dvh/s);
    expect(source).not.toContain('dashboard-mocha-liquid-glass.png');
  });

  it('keeps fields dark and text readable without white or grey control surfaces', () => {
    expect(source).toMatch(/--dj-field:\s*linear-gradient/);
    expect(source).toMatch(/\.page input[\s\S]*color:\s*var\(--dj-white\)[\s\S]*background:\s*var\(--dj-field\)/);
    expect(source).toMatch(/input::placeholder[\s\S]*var\(--dj-muted\)/);
  });

  it('styles portal menus, modal surfaces, green primary actions and destructive actions', () => {
    expect(source).toContain(':global(.ww-djmc-portal)');
    expect(source).toMatch(/\.shareModal, \.dialogSurface/);
    expect(source).toMatch(/\.primaryAction\s*\{[\s\S]*#22c55e/);
    expect(source).toMatch(/\.dangerAction\s*\{[\s\S]*#ef4444/);
  });

  it('applies the approved page, section, modal, label, body and button hierarchy', () => {
    expect(source).toMatch(/\.pageHeading\s*\{[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(source).toMatch(/\.sectionHeading\s*\{[\s\S]*?font-size:\s*20px\s*!important;[\s\S]*?font-weight:\s*500\s*!important;/);
    expect(source).toMatch(/\.shareModal h2,[\s\S]*?font-size:\s*20px\s*!important;[\s\S]*?font-weight:\s*500\s*!important;/);
    expect(source).toMatch(/\.fieldLabel,[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(source).toMatch(/\.supportingText,[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*400\s*!important;[\s\S]*?line-height:\s*18px\s*!important;/);
    expect(source).toMatch(/\.primaryAction,[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*500\s*!important;/);
    expect(source).toMatch(/\.columnHeader\s*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
  });

  it('wires the hierarchy through every feature-owned screen surface', () => {
    expect(pageSource).toContain('theme.pageHeading');
    expect(pageSource).toContain('theme.supportingText');
    expect(pageSource.match(/theme\.eventDetailLabel/g)).toHaveLength(2);
    expect(pageSource.match(/theme\.eventDetailText/g)).toHaveLength(6);
    expect(sectionSource).toContain('theme.sectionHeading');
    expect(sectionSource).toContain('theme.fieldLabel');
    expect(requestsSource).toContain('theme.sectionHeading');
    expect(shareSource).toContain('theme.bodyText');
    expect(publicSource).toContain('theme.modalHeading');
    expect(publicSource).toContain('theme.supportingText');
    expect(publicSource.match(/theme\.eventDetailLabel/g)).toHaveLength(2);
    expect(publicSource.match(/theme\.eventDetailText/g)).toHaveLength(6);
  });

  it('preserves event-title and compact-control typography', () => {
    expect(pageSource).toContain('<h2 className="text-xl font-semibold text-primary">{selectedEvent.name}</h2>');
    expect(publicSource).toContain('<h2 className="text-xl font-semibold text-primary">{data.event_name}</h2>');
    expect(publicSource).toContain('<h1 className="text-xl font-bold">{data.event_name}</h1>');
    expect(sectionSource).toContain('text-xs font-medium inline-flex');
    expect(sectionSource).toContain('text-[9px] text-muted-foreground');
    expect(requestsSource).toContain('text-[10px] uppercase tracking-wide');
    expect(source).not.toMatch(/\.eventBanner h[12]\s*\{[^}]*font-(?:size|weight)/);
  });

  it('keeps the hierarchy invariant across existing desktop, tablet and mobile layouts', () => {
    expect(source).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.page \.row \{[\s\S]*?flex-wrap:\s*wrap;/);
    expect(source).toContain('.page .columnHeader { display: none !important; }');
    expect(sectionSource).toContain('max-lg:overflow-hidden');
    expect(sectionSource).toContain('max-lg:min-w-[1180px]');
    expect(pageSource).toContain('max-sm:text-center');
  });

  it('keeps the public espresso theme screen-only and isolated from dashboard and PDF presentation', () => {
    expect(source).toContain('Public DJ/MC share page: screen-only espresso liquid-glass presentation.');
    expect(source).toMatch(/@media screen\s*\{[\s\S]*?\.publicPage\s*\{[\s\S]*?radial-gradient[\s\S]*?linear-gradient/s);
    expect(source).toMatch(/\.publicPage \.sectionCard[\s\S]*?backdrop-filter:\s*blur\(20px\)/);
    expect(source).toMatch(/\.publicPage \.row:nth-of-type\(even\)[\s\S]*?background:/);
    expect(source).toMatch(/@media screen and \(max-width: 1023px\)[\s\S]*?\.publicPage \.mobileRows\s*\{[\s\S]*?min-width:\s*0\s*!important/);
    expect(source).toMatch(/@media screen and \(max-width: 1023px\)[\s\S]*?\.publicPage \.row\s*\{[\s\S]*?flex-wrap:\s*wrap/);
    expect(source).not.toContain('@media print {\n  .publicPage');
  });
});
