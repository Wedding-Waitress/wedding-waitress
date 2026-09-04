import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicCss = readFileSync('src/styles/PublicSite.css', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const header = readFileSync('src/components/Layout/Header.tsx', 'utf8');
const landing = readFileSync('src/pages/Landing.tsx', 'utf8');
const productLayout = readFileSync('src/components/Layout/ProductPageLayout.tsx', 'utf8');
const currencySelector = readFileSync('src/components/ui/CurrencySelector.tsx', 'utf8');
const weddingsCardImage = statSync('src/assets/homepage-weddings-card.jpg');
const engagementsCardImage = statSync('src/assets/homepage-engagements-card.jpg');
const birthdaysCardImage = statSync('src/assets/homepage-birthdays-card.jpg');
const celebrationsOfLifeCardImage = statSync('src/assets/homepage-celebrations-of-life-card.jpg');
const corporateEventsCardImage = statSync('src/assets/homepage-corporate-events-card.jpg');
const christmasPartiesCardImage = statSync('src/assets/homepage-christmas-parties-card.jpg');
const workflowMyEventsImage = statSync('src/assets/homepage-workflow-my-events.jpg');
const workflowBudgetPlannerImage = statSync('src/assets/homepage-workflow-budget-planner.jpg');
const workflowCelebrationImage = statSync('src/assets/homepage-workflow-celebration.jpg');
const workflowGuestListImage = statSync('src/assets/homepage-workflow-guest-list.jpg');
const workflowTablesImage = statSync('src/assets/homepage-workflow-tables.jpg');

describe('public Wedding Waitress brand colour system', () => {
  it('uses an optimized photograph only for the Weddings homepage event card', () => {
    expect(landing).toContain("import weddingsCardImage from '@/assets/homepage-weddings-card.jpg';");
    expect(landing).toContain('if (index === 0) return');
    expect(landing).toContain('alt="Bride and groom celebrating their wedding"');
    expect(landing).toContain('className="relative aspect-[3/2] w-full"');
    expect(landing).toContain('className="h-full w-full object-cover"');
    expect(landing).toContain('className="absolute inset-x-0 bottom-0 flex h-9 items-center bg-white/50 px-6 backdrop-blur-sm"');
    expect(landing).toContain('<h3 className="text-xl font-semibold">{eventType.name}</h3>');
    expect(landing).toContain('className="ww-card ww-focus group overflow-hidden md:col-span-2 lg:col-span-1 ring-2 ring-[#a88558]/30"');
    expect(weddingsCardImage.size).toBeLessThan(300_000);
  });

  it('matches the approved Weddings design on the Engagements homepage event card', () => {
    expect(landing).toContain("import engagementsCardImage from '@/assets/homepage-engagements-card.jpg';");
    expect(landing).toContain('if (index === 1) return');
    expect(landing).toContain('alt="Engaged couple celebrating their proposal"');
    expect(landing).toContain('<img src={engagementsCardImage} alt="Engaged couple celebrating their proposal" loading="lazy" width="1400" height="933" className="h-full w-full object-cover" />');
    expect(engagementsCardImage.size).toBeLessThan(300_000);
  });

  it('matches the approved design on the Birthdays & Parties homepage event card', () => {
    expect(landing).toContain("import birthdaysCardImage from '@/assets/homepage-birthdays-card.jpg';");
    expect(landing).toContain('if (index === 2) return');
    expect(landing).toContain('alt="Children celebrating a birthday with cake and balloons"');
    expect(landing).toContain('<img src={birthdaysCardImage} alt="Children celebrating a birthday with cake and balloons" loading="lazy" width="1400" height="933" className="h-full w-full object-cover" />');
    expect(birthdaysCardImage.size).toBeLessThan(300_000);
  });

  it('matches the approved design on the Corporate Events homepage event card', () => {
    expect(landing).toContain("import corporateEventsCardImage from '@/assets/homepage-corporate-events-card.jpg';");
    expect(landing).toContain('if (index === 3) return');
    expect(landing).toContain('alt="Corporate event with champagne service"');
    expect(landing).toContain('<img src={corporateEventsCardImage} alt="Corporate event with champagne service" loading="lazy" width="1400" height="933" className="h-full w-full object-cover" />');
    expect(corporateEventsCardImage.size).toBeLessThan(300_000);
  });

  it('matches the approved design and homepage-only title on the Christmas card', () => {
    expect(landing).toContain("import christmasPartiesCardImage from '@/assets/homepage-christmas-parties-card.jpg';");
    expect(landing).toContain('if (index === 4) return');
    expect(landing).toContain('alt="Colleagues celebrating a Christmas party with gifts"');
    expect(landing).toContain('<img src={christmasPartiesCardImage} alt="Colleagues celebrating a Christmas party with gifts" loading="lazy" width="1400" height="933" className="h-full w-full object-cover" />');
    expect(landing).toContain('<h3 className="text-xl font-semibold">Christmas Parties</h3>');
    expect(christmasPartiesCardImage.size).toBeLessThan(300_000);
  });

  it('matches the approved design and homepage-only title on Celebrations of Life', () => {
    const eventSection = landing.slice(landing.indexOf('One platform for every kind of gathering'), landing.indexOf('const faqs'));
    expect(landing).toContain("import celebrationsOfLifeCardImage from '@/assets/homepage-celebrations-of-life-card.jpg';");
    expect(landing).toContain('<img src={celebrationsOfLifeCardImage} alt="Friends raising champagne together at a celebration" loading="lazy" width="1400" height="933" className="h-full w-full object-cover" />');
    expect(landing).toContain('<h3 className="text-xl font-semibold">Memorials & Celebrations of Life</h3>');
    expect(landing).toContain('to={eventType.path}');
    expect(eventSection.match(/h-9 items-center bg-white\/50/g)).toHaveLength(6);
    expect(eventSection.match(/text-xl font-semibold/g)).toHaveLength(6);
    expect(eventSection).not.toContain('text-2xl font-semibold');
    expect(celebrationsOfLifeCardImage.size).toBeLessThan(300_000);
  });

  it('uses the approved image treatment on the first homepage workflow card', () => {
    expect(landing).toContain("import workflowMyEventsImage from '@/assets/homepage-workflow-my-events.jpg';");
    expect(landing).toContain('alt="Bride and groom ready to plan their wedding event"');
    expect(landing).toContain('<img src={workflowMyEventsImage} alt="Bride and groom ready to plan their wedding event" loading="lazy" width="1400" height="933" className="h-full w-full object-cover" />');
    expect(landing).toContain('className="ww-public-link absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-sm font-bold backdrop-blur-sm">01</span>');
    expect(landing).toContain('steps.map(([,title,text], index) => { if (index === 0) return');
    expect(workflowMyEventsImage.size).toBeLessThan(300_000);
  });

  it('uses the approved image treatment and homepage-only title on the budget workflow card', () => {
    expect(landing).toContain("import workflowBudgetPlannerImage from '@/assets/homepage-workflow-budget-planner.jpg';");
    expect(landing).toContain('alt="Couple meeting with a wedding planner to organise their budget"');
    expect(landing).toContain('<img src={workflowBudgetPlannerImage} alt="Couple meeting with a wedding planner to organise their budget" loading="lazy" width="1400" height="933" className="h-full w-full object-cover" />');
    expect(landing).toContain('className="ww-public-link absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-sm font-bold backdrop-blur-sm">02</span>');
    expect(landing).toContain('<h3 className="text-xl font-semibold">Budget Planner</h3>');
    expect(workflowBudgetPlannerImage.size).toBeLessThan(300_000);
  });

  it('uses the approved image treatment on Guest List and aligns all workflow heading sizes', () => {
    const workflowSection = landing.slice(landing.indexOf('From first event detail to final song'), landing.indexOf('homepage-products-title'));
    expect(landing).toContain("import workflowGuestListImage from '@/assets/homepage-workflow-guest-list.jpg';");
    expect(landing).toContain('alt="Guest list planning on a computer"');
    expect(landing).toContain('<img src={workflowGuestListImage} alt="Guest list planning on a computer" loading="lazy" width="1400" height="933" className="h-full w-full object-cover" />');
    expect(landing).toContain('className="ww-public-link absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-sm font-bold backdrop-blur-sm">04</span>');
    expect(workflowSection).not.toContain('text-2xl font-semibold');
    expect(workflowSection.match(/text-xl font-semibold/g)).toHaveLength(5);
    expect(workflowGuestListImage.size).toBeLessThan(300_000);
  });

  it('uses the approved image treatment on Tables without changing its heading size', () => {
    expect(landing).toContain("import workflowTablesImage from '@/assets/homepage-workflow-tables.jpg';");
    expect(landing).toContain('<img src={workflowTablesImage} alt="Wedding reception tables arranged for guests" loading="lazy" width="1400" height="933" className="h-full w-full object-cover" />');
    expect(landing).toContain('className="ww-public-link absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-sm font-bold backdrop-blur-sm">03</span>');
    expect(landing).toContain('<h3 className="text-xl font-semibold">{title}</h3>');
    expect(workflowTablesImage.size).toBeLessThan(300_000);
  });

  it('uses the approved image treatment on Share, Celebrate & Enjoy without changing its font size', () => {
    expect(landing).toContain("import workflowCelebrationImage from '@/assets/homepage-workflow-celebration.jpg';");
    expect(landing).toContain('<img src={workflowCelebrationImage} alt="Bride celebrating with friends and champagne" loading="lazy" width="1400" height="933" className="h-full w-full object-cover" />');
    expect(landing).toContain('className="ww-public-link absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-sm font-bold backdrop-blur-sm">05</span>');
    expect(landing).toContain('<h3 className="text-xl font-semibold leading-none">{title}</h3>');
    expect(workflowCelebrationImage.size).toBeLessThan(300_000);
  });

  it('uses the exact dominant colour sampled from the approved logo as one token', () => {
    expect(publicCss.match(/--ww-dark-brown:/g)).toHaveLength(1);
    expect(publicCss).toContain('--ww-dark-brown: #412419;');
  });

  it('keeps dark surfaces legible while applying dark brown to light headings', () => {
    expect(publicCss).toMatch(/\.ww-public h1,[\s\S]*color: var\(--ww-dark-brown\)/);
    expect(publicCss).toMatch(/\.ww-public \.ww-section-espresso :where\(h1, h2, h3\),[\s\S]*color: #fff/);
    expect(publicCss).toContain('.ww-section-espresso .ww-eyebrow');
    expect(publicCss).toContain('color: var(--ww-champagne);');
  });

  it('implements four desktop mega-menu columns and responsive mobile categories', () => {
    expect(publicCss).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    expect(publicCss).toContain('.ww-mobile-product-grid');
    expect(header).toContain('className="ww-products-menu-grid"');
    expect(header).toContain('className="ww-products-menu-heading"');
    expect(header).toContain('Explore all products →');
  });

  it('shares selected and focus treatments across currency and language menus', () => {
    expect(header).toContain('className="ww-selector-item cursor-pointer rounded-xl"');
    expect(header).toContain("dir={lang.code === 'ar' ? 'rtl' : 'ltr'}");
    expect(currencySelector).toContain('data-selected={active}');
    expect(currencySelector).toContain('ww-selector-trigger');
  });

  it('uses a balanced four-column desktop and two-column tablet/mobile home product grid', () => {
    expect(publicCss).toContain('.ww-product-icon-grid .ww-icon-orb { width: 6.25rem; height: 6.25rem; }');
    expect(publicCss).toContain('.ww-product-icon-grid .ww-icon-orb svg { width: 2.625rem; height: 2.625rem; }');
    expect(landing).toContain('ww-product-icon-grid mt-10 grid grid-cols-2 gap-x-2 gap-y-8 lg:grid-cols-4');
    expect(landing).not.toContain('ww-product-icon-grid mt-10 grid grid-cols-2 gap-x-2 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5');
  });

  it('removes the homepage pricing section without removing pricing navigation or its page', () => {
    expect(landing).not.toContain('Straightforward pricing');
    expect(landing).not.toContain('One event. Twelve months. The complete platform.');
    expect(landing).not.toContain('Compare Pricing');
    expect(header).toContain('<Link to="/pricing"');
    expect(app).toContain('<Route path="/pricing" element={<Pricing />} />');
  });

  it('shares the approved embossed button surface with public icon medallions', () => {
    expect(publicCss).toContain('--ww-embossed-surface:');
    expect(publicCss).toMatch(/\.ww-button-primary,[\s\S]*background: var\(--ww-embossed-surface\) !important;/);
    expect(publicCss).toMatch(/\.ww-icon-orb \{[\s\S]*background: var\(--ww-embossed-surface\);[\s\S]*aspect-ratio: 1;/);
    expect(publicCss).toContain('.ww-public .group:is(a, button):hover .ww-icon-orb');
    expect(publicCss).toContain('.ww-public .group:is(a, button):active .ww-icon-orb');
    expect(landing).not.toContain('group-hover:-translate-y-1');
  });

  it('uses two-pixel surface-aware image borders without padded frames', () => {
    expect(publicCss).toContain('border: 2px solid var(--ww-dark-brown);');
    expect(publicCss).toMatch(/\.ww-image-frame \{[^}]*padding: 0;/);
    expect(publicCss).toContain('.ww-section-espresso .ww-image-frame');
    expect(publicCss).toContain('border-color: var(--ww-champagne);');
    expect(productLayout).toContain('className="ww-media-card"');
  });
});
