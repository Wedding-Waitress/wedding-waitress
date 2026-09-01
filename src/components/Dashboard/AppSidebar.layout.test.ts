import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/components/Dashboard/AppSidebar.tsx', 'utf8');
const styles = readFileSync('src/components/Dashboard/AppSidebar.module.css', 'utf8');

describe('workflow sidebar badge alignment contract', () => {
  it('uses one fixed action column and one fixed final badge column', () => {
    expect(styles).toMatch(/\.workflowNav\s*\{[\s\S]*grid-template-columns:\s*18px minmax\(0, 1fr\) 4\.5rem 1\.5rem;/);
    expect(styles).toMatch(/\.workflowActionSlot\s*\{[\s\S]*width:\s*4\.5rem;/);
    expect(styles).toMatch(/\.workflowNav \.countBadge\s*\{[\s\S]*justify-self:\s*end;/);
  });

  it('renders the reserved action slot and final badge for every workflow step', () => {
    expect(source).toContain('data-workflow-action-slot="true"');
    expect(source).toContain('data-workflow-badge={badgeNumber}');
    expect(source).toContain('styles.workflowLabel');
  });
});
