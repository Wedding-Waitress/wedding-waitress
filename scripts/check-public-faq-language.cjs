// Read-only local browser verification. Opens FAQ disclosures; never submits forms.
const { chromium } = require('C:/Users/User__/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const language of ['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.addInitScript(lang => localStorage.setItem('i18nextLng', lang), language);
      const page = await context.newPage();
      await page.goto('http://localhost:8080/faq', { waitUntil: 'domcontentloaded' });
      await page.locator('main details').first().waitFor();
      await page.waitForFunction(lang => document.documentElement.lang === lang, language);
      await page.locator('main details').evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
      const result = await page.evaluate(() => ({
        language: document.documentElement.lang,
        direction: document.documentElement.dir,
        questions: document.querySelectorAll('main details summary').length,
        answers: document.querySelectorAll('main details p').length,
        leftoverQuestion: [...document.querySelectorAll('main details summary')].some(node => node.textContent.includes('What is Wedding Waitress?')),
        leftoverAnswer: [...document.querySelectorAll('main details p')].some(node => node.textContent.includes('Available upgrade options are shown')),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      }));
      if (result.questions !== 20 || result.answers !== 20 || result.overflow || (language !== 'en' && (result.leftoverQuestion || result.leftoverAnswer))) throw new Error(JSON.stringify(result));
      console.log(JSON.stringify(result));
      if (language === 'ar') {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('main details').first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: 'work/faq-ar-mobile.png', animations: 'disabled' });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Arabic FAQ mobile overflow');
      }
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
