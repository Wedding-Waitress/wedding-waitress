// Local, isolated browser contexts. Opens preferences only; never saves consent.
const { chromium } = require('C:/Users/User__/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const languages = process.env.WW_REVIEW_LANGUAGE ? [process.env.WW_REVIEW_LANGUAGE] : ['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'];
    for (const language of languages) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await context.addInitScript(lang => localStorage.setItem('i18nextLng', lang), language);
      const page = await context.newPage();
      await page.goto('http://localhost:8080/my-events', { waitUntil: 'domcontentloaded' });
      const banner = page.locator('div.fixed.bottom-0');
      await banner.waitFor();
      await page.waitForFunction(lang => document.documentElement.lang === lang, language);
      const check = async phase => {
        const result = await page.evaluate(() => ({ language: document.documentElement.lang, overflow: document.documentElement.scrollWidth > innerWidth + 1, storedConsent: localStorage.getItem('cookie_consent') }));
        if (result.overflow || result.storedConsent !== null) throw new Error(JSON.stringify({ phase, ...result }));
      };
      await check('banner');
      if (language !== 'en' && (await banner.innerText()).includes('We use cookies')) throw new Error(`${language}: English cookie banner`);
      await banner.getByRole('button').first().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await page.waitForTimeout(400);
      await check('preferences');
      if (language !== 'en' && (await dialog.innerText()).includes('Choose which cookies')) throw new Error(`${language}: English cookie preferences`);
      if (language === 'ar') await page.screenshot({ path: 'work/cookie-preferences-ar-mobile.png', animations: 'disabled' });
      console.log(JSON.stringify({ language, mobileBanner: 'pass', preferences: 'pass', consentSaved: false }));
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
