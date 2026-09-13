import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routesSource = readFileSync('src/pages/events/PublicEventRoutes.tsx', 'utf8');

describe('public event guide heading copy', () => {
  it('uses the full, correctly capitalised Christmas and seasonal event name in generated headings', () => {
    expect(routesSource).toContain("eventType.id === 'christmas-seasonal-events'");
    expect(routesSource).toContain("? 'Christmas & Seasonal Events'");
    expect(routesSource).toContain('Plan around the realities of {headingEventName}');
    expect(routesSource).toContain('Planning {headingEventName}');
    expect(routesSource).toContain('Plan {headingEventName} in one connected place');
  });

  it('uses the full, correctly capitalised memorials and celebrations of life name in generated headings', () => {
    expect(routesSource).toContain("eventType.id === 'memorials-celebrations-of-life'");
    expect(routesSource).toContain("? 'Memorials & Celebrations of Life'");
    expect(routesSource).toContain('Plan around the realities of {headingEventName}');
    expect(routesSource).toContain('Planning {headingEventName}');
    expect(routesSource).toContain('Plan {headingEventName} in one connected place');
  });

  it('preserves the existing lower-case generated wording for every other event guide', () => {
    expect(routesSource).toContain(': eventType.shortName.toLowerCase();');
  });
});
