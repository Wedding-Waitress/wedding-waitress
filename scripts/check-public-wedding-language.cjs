// Read-only local event-guide review. No signup, checkout or hosted state changes.
const { chromium } = require('C:/Users/User__/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const languages = process.env.WW_REVIEW_LANGUAGE ? [process.env.WW_REVIEW_LANGUAGE] : ['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'];
    for (const language of languages) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.addInitScript(lang => localStorage.setItem('i18nextLng', lang), language);
      const page = await context.newPage();
      await page.goto('http://localhost:8080/events/weddings', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(lang => document.documentElement.lang === lang, language);
      await page.locator('main details').first().waitFor();
      await page.locator('main details').evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
      const result = await page.evaluate(() => {
        const text = document.querySelector('main').textContent;
        return {
          language: document.documentElement.lang,
          direction: document.documentElement.dir,
          faqCount: document.querySelectorAll('main details').length,
          untranslated: ['Details change together','Set the wedding foundation','A more considered guest journey','When a guest confirms a dietary requirement','Can we plan both the ceremony and reception?','Yes. You can continue updating event, guest and seating details','Common questions','Planning ','Plan around the realities of '].filter(value => text.includes(value)),
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      if (result.faqCount !== 4 || result.overflow || (language !== 'en' && result.untranslated.length)) throw new Error(JSON.stringify(result));
      console.log(JSON.stringify(result));
      if (language === 'ar') {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('main details').first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(900);
        await page.screenshot({ path: 'work/weddings-ar-faq-mobile.png', animations: 'disabled' });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Arabic wedding mobile overflow');
      }
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
