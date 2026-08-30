import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');
const globalCss = read('src/index.css');
const dashboardSidebar = read('src/components/ui/sidebar.tsx');
const dashboardSidebarCss = read('src/components/Dashboard/AppSidebar.module.css');
const accountCss = read('src/pages/Account.module.css');
const adminCss = read('src/pages/Admin.module.css');
const accountPage = read('src/pages/Account.tsx');
const adminPage = read('src/pages/Admin.tsx');
const accountControlsCss = read('src/components/Account/AccountControls.module.css');
const profileImageCss = read('src/components/Account/ProfileImageEditor.module.css');
const adminContentCss = read('src/components/Admin/AdminCentrePages.module.css');

describe('authenticated sidebar geometry', () => {
  it('reuses the approved application canvas for every desktop rail and mobile drawer', () => {
    expect(globalCss).toContain('--ww-sidebar-background-color: var(--ww-application-background-color);');
    expect(globalCss).toContain('--ww-sidebar-background-image: var(--ww-application-background-image);');
    expect(globalCss).toMatch(/\.ww-sidebar-background\s*\{[\s\S]*min-height:\s*100dvh[\s\S]*background-position:\s*var\(--ww-application-background-position\) !important[\s\S]*background-repeat:\s*var\(--ww-application-background-repeat\) !important[\s\S]*background-size:\s*var\(--ww-application-background-size\) !important/);

    expect(dashboardSidebar.match(/ww-sidebar-background/g)).toHaveLength(3);
    expect(accountPage.match(/ww-sidebar-background/g)).toHaveLength(2);
    expect(adminPage.match(/ww-sidebar-background/g)).toHaveLength(2);

    expect(dashboardSidebarCss).not.toContain('radial-gradient(circle at 52% -5%');
    expect(accountCss).not.toContain('radial-gradient(circle at 50% -5%');
    expect(adminCss).not.toContain('radial-gradient(circle at 50% -5%');
    expect(adminCss).not.toContain('linear-gradient(180deg,rgba(54,29,21,.99),rgba(22,10,7,.99))');
  });

  it('uses the approved Dashboard widths as shared layout tokens', () => {
    expect(globalCss).toContain('--ww-sidebar-width: 16rem;');
    expect(globalCss).toContain('--ww-sidebar-width-mobile: 17.5rem;');
    expect(dashboardSidebar).toContain('var(--ww-sidebar-width, 16rem)');
    expect(dashboardSidebar).toContain('var(--ww-sidebar-width-mobile, 17.5rem)');
  });

  it.each([
    ['Account Centre', accountCss],
    ['Admin Centre', adminCss],
  ])('%s aligns its desktop sidebar and content edge to the shared width', (_name, css) => {
    expect(css).toMatch(/width:\s*var\(--ww-sidebar-width,\s*16rem\)/);
    expect(css).toMatch(/width:\s*calc\(100%\s*-\s*var\(--ww-sidebar-width,\s*16rem\)\)/);
    expect(css).toMatch(/margin-left:\s*var\(--ww-sidebar-width,\s*16rem\)/);
    expect(css).not.toContain('292px');
  });

  it.each([
    ['Account Centre', accountCss],
    ['Admin Centre', adminCss],
  ])('%s keeps its responsive drawer within the Dashboard mobile width', (_name, css) => {
    expect(css).toMatch(/width:\s*min\(90vw,\s*var\(--ww-sidebar-width-mobile,\s*17\.5rem\)\)/);
    expect(css).not.toContain('326px');
  });

  it('uses the preserved Account Centre navigation typography across all three sidebars', () => {
    expect(globalCss).toContain('--ww-interface-font-family: Manrope, ui-sans-serif, system-ui, sans-serif');
    expect(globalCss).toContain('--ww-auth-nav-font-family: var(--ww-interface-font-family)');
    expect(globalCss).toContain('--ww-auth-nav-font-size: .86rem;');
    for (const css of [dashboardSidebarCss, accountCss, adminCss]) {
      expect(css).toContain('var(--ww-auth-nav-font-family)');
      expect(css).toContain('var(--ww-auth-nav-font-size)');
    }
  });

  it('keeps Dashboard geometry and gives Account and Admin the same compact row contract', () => {
    expect(globalCss).toContain('--ww-auth-nav-row-height: 2rem;');
    expect(globalCss).toContain('--ww-auth-nav-radius: .625rem;');
    expect(globalCss).toContain('--ww-auth-nav-active-border: rgba(242, 221, 189, .76);');
    for (const css of [dashboardSidebarCss, accountCss, adminCss]) {
      expect(css).toContain('var(--ww-auth-nav-row-height)');
      expect(css).toContain('var(--ww-auth-nav-radius)');
      expect(css).toContain('var(--ww-auth-nav-active-border)');
    }
    expect(accountCss).not.toContain('min-height: 44px');
    expect(adminCss).not.toContain('min-height:44px');
  });

  it('makes Back compact and keeps content controls compact with mobile touch targets', () => {
    expect(accountCss).toContain('.sidebarActions .backAction');
    expect(accountCss).toContain('border-radius: var(--ww-auth-nav-radius) !important');
    expect(adminCss).toContain('.back{border-color:var(--ww-auth-nav-active-border)');
    expect(accountControlsCss).toContain('min-height: var(--ww-compact-button-height) !important');
    expect(accountControlsCss).toContain('border-radius: var(--ww-compact-button-radius) !important');
    expect(profileImageCss).toContain('min-height: var(--ww-compact-button-height)');
    expect(adminCss).toContain('--ww-admin-action-height:2rem');
    expect(adminContentCss).toContain('height:var(--ww-admin-action-height)');
    for (const css of [accountControlsCss, profileImageCss, adminContentCss]) {
      expect(css).toContain('var(--ww-compact-button-mobile-height)');
    }
  });

  it('lets every Admin page use the wide shared content contract without page overflow', () => {
    expect(adminCss).toContain('--ww-admin-content-max-width:1728px');
    expect(adminCss).toContain('--ww-admin-content-gutter:clamp(32px,2.5vw,48px)');
    expect(adminCss).toContain('max-width:var(--ww-admin-content-max-width)');
    expect(adminContentCss).toContain('.actionRow{display:flex;flex-wrap:nowrap;gap:4px;white-space:nowrap}');
    expect(adminContentCss).toContain('.tableWrap{max-width:100%;overflow:auto');
    expect(adminContentCss).toContain('min-height:var(--ww-compact-button-mobile-height)');
  });

  it('uses restrained shared typography for ordinary Account and Admin records', () => {
    expect(accountCss).toContain(':where(p, label, dt, dd, li, table, th, td)');
    expect(accountCss).toContain('font-weight: var(--ww-auth-nav-active-weight) !important');
    expect(adminContentCss).toContain('font-weight:var(--ww-auth-nav-font-weight)');
    expect(adminContentCss).not.toContain('font-weight:700');
  });
});
