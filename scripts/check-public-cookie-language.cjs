// Read-only local browser review. Never submits forms or contacts Stripe.
const { chromium } = require('C:/Users/User__/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const language of (process.env.WW_REVIEW_LANGUAGE ? [process.env.WW_REVIEW_LANGUAGE] : ['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.addInitScript(lang => localStorage.setItem('i18nextLng', lang), language);
      const page = await context.newPage();
      await page.goto('http://localhost:8080/cookies', { waitUntil: 'domcontentloaded' });
      await page.locator('main section h2').first().waitFor();
      await page.waitForFunction(lang => document.documentElement.lang === lang, language);
      const result = await page.evaluate(() => ({
        language: document.documentElement.lang,
        direction: document.documentElement.dir,
        headings: [...document.querySelectorAll('main section h2')].map(node => node.textContent),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        leftoverEnglish: document.querySelector('main').textContent.includes('Cookies are small text files'),
      }));
      if (result.headings.length !== 8 || result.overflow || (language !== 'en' && result.leftoverEnglish)) throw new Error(JSON.stringify(result));
      console.log(JSON.stringify(result));
      if (language === 'ar') {
        const revealPage = async () => {
          const height = await page.evaluate(() => document.documentElement.scrollHeight);
          for (let y = 0; y < height; y += 500) {
            await page.evaluate(offset => window.scrollTo(0, offset), y);
            await page.waitForTimeout(350); // Allow existing intersection/reveal transitions to paint.
          }
          await page.evaluate(() => window.scrollTo(0, 0));
        };
        await revealPage();
        await page.screenshot({ path: 'work/cookies-ar-desktop.png', fullPage: true, animations: 'disabled' });
        await page.setViewportSize({ width: 390, height: 844 });
        await revealPage();
        await page.screenshot({ path: 'work/cookies-ar-mobile.png', fullPage: true, animations: 'disabled' });
        const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        if (mobileOverflow) throw new Error('Arabic mobile page overflows');
        await page.locator('main section h2').first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(700);
        console.log(JSON.stringify(await page.locator('main section h2').first().evaluate(node => {
          const ancestors = [];
          for (let current = node; current; current = current.parentElement) {
            const style = getComputedStyle(current);
            const rect = current.getBoundingClientRect();
            ancestors.push({ tag: current.tagName, class: current.className, opacity: style.opacity, visibility: style.visibility, display: style.display, x: rect.x, y: rect.y, width: rect.width });
          }
          return ancestors;
        })));
        await page.screenshot({ path: 'work/cookies-ar-section.png', animations: 'disabled' });
      }
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
