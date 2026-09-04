import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Onboarding/GuidedEventSetup.tsx'), 'utf8');
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Onboarding/GuidedEventSetup.module.css'), 'utf8');

describe('Guided Event Setup customer contract', () => {
  it('contains ten named steps, no Skip control and a Guest List final destination', () => {
    expect(source).toContain("const STEP_NAMES = ['Welcome', 'Celebration', 'Event details', 'Date & location', 'Event parts', 'Guests', 'Tables', 'Budget', 'Review', 'Ready']");
    expect(source).not.toMatch(/>\s*Skip\s*</i);
    expect(source).toContain("navigate('/dashboard?tab=guest-list'");
  });

  it('keeps Live Slideshow lookup, media slideshow and guestbook capabilities distinct', () => {
    expect(source).toContain("['Live Slideshow', 'Provide guest-name and table lookup");
    expect(source).toContain("['Live Gallery & Slideshow', 'Display shared photos");
    expect(source).toContain("['Digital Guestbooks', 'Collect written, photo and audio guestbook messages");
  });

  it('has explicit desktop, tablet and mobile-safe layout rules with solid text', () => {
    expect(css).toContain('@media (max-width: 760px)');
    expect(css).toContain('@media (max-width: 420px)');
    expect(css).toContain('overflow-x: clip');
    expect(css).toContain('opacity: 1');
    expect(css).toContain('--espresso: #412419');
  });

  it('uses compact responsive headings and controls with scoped brown navigation', () => {
    expect(css).toContain('font-size: 32px');
    expect(css).toContain('font-size: 28px');
    expect(css).toContain('font-size: 24px');
    expect(css).toContain('height: 44px');
    expect(css).toContain('min-height: 52px');
    expect(css).toContain('background: #412419');
    expect(css).not.toContain('0 4px 0 #145b36');
  });

  it('keeps Next actionable and exposes accessible field-level validation', () => {
    expect(source).toContain('const nextDisabled = saving || creating');
    expect(source).toContain('data-validation-field={field}');
    expect(source).toContain("'aria-invalid': Boolean(error)");
    expect(source).toContain("'aria-describedby': error ? errorId : undefined");
    expect(source).toContain('Please correct {validationIssues.length} items:');
    expect(source).toContain('focusFirstInvalid(issues[0].field)');
  });

  it('collects and reviews the existing venue contact fields', () => {
    expect(source).toContain('venueContactName');
    expect(source).toContain('venuePhone');
    expect(source).toContain('venueContactEmail');
    expect(source).toContain('Contact: {answers.venueContactName}');
  });
});
