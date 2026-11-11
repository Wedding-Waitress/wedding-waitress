// Read-only local My Events marketing review. No form submissions or account changes.
const { chromium } = require('C:/Users/User__/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const languages = process.env.WW_REVIEW_LANGUAGE ? [process.env.WW_REVIEW_LANGUAGE] : ['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'];
    for (const language of languages) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.addInitScript(lang => localStorage.setItem('i18nextLng', lang), language);
      const page = await context.newPage();
      await page.goto('http://localhost:8080/my-events', { waitUntil: 'domcontentloaded' });
      await page.locator('#product-demo').waitFor();
      await page.waitForFunction(lang => document.documentElement.lang === lang, language);
      const result = await page.evaluate(() => ({
        language: document.documentElement.lang,
        direction: document.documentElement.dir,
        remainingEnglishLead: document.querySelector('main').textContent.includes('Create your event once'),
        remainingEnglishGuide: document.querySelector('main').textContent.includes('The event overview keeps'),
        remainingEnglishBenefit: document.querySelector('main').textContent.includes('A clear event overview'),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      }));
      if (result.overflow || (language !== 'en' && (result.remainingEnglishLead || result.remainingEnglishGuide || result.remainingEnglishBenefit))) throw new Error(JSON.stringify(result));
      console.log(JSON.stringify(result));
      if (language === 'ar') {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('#product-demo h2').scrollIntoViewIfNeeded();
        await page.waitForTimeout(1200);
        await page.screenshot({ path: 'work/my-events-ar-mobile.png', animations: 'disabled' });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Arabic My Events mobile overflow');
      }
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
