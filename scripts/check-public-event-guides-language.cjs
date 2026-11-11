// Read-only local guide checks: no forms, purchases or hosted state changes.
const fs = require('node:fs');
const ts = require('typescript');
const { chromium } = require('C:/Users/User__/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const compiled = ts.transpileModule(fs.readFileSync('src/content/publicEventTypes.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const manifest = { exports: {} };
new Function('exports','module',compiled)(manifest.exports,manifest);
const events = manifest.exports.publicEventTypes;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const languages = process.env.WW_REVIEW_LANGUAGE ? [process.env.WW_REVIEW_LANGUAGE] : ['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'];
    for (const language of languages) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.addInitScript(lang => localStorage.setItem('i18nextLng',lang),language);
      const page = await context.newPage();
      for (const event of events) {
        await page.goto(`http://localhost:8080${event.path}`,{ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(lang => document.documentElement.lang === lang,language);
        await page.locator('main details').first().waitFor();
        await page.locator('main details').evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
        const messages = [...[...event.challenges,...event.howItWorks,...event.benefits,event.example].flatMap(item=>[item.title,item.text]),...event.faqs.flatMap(item=>[item.question,item.answer])];
        const result = await page.evaluate(originals => {
          const text = document.querySelector('main').textContent;
          return { language: document.documentElement.lang, direction: document.documentElement.dir, untranslated: originals.filter(original=>text.includes(original)), overflow: document.documentElement.scrollWidth > innerWidth+1 };
        },messages);
        if(result.overflow || (language !== 'en' && result.untranslated.length)) throw new Error(JSON.stringify({ path: event.path,...result }));
        console.log(JSON.stringify({ path: event.path,...result, untranslated: result.untranslated.length }));
        if(language === 'ar') {
          await page.setViewportSize({ width: 390,height: 844 });
          await page.locator('main details').first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(700);
          await page.screenshot({ path: `work/event-${event.id}-ar-mobile.png`,animations:'disabled' });
          if(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1)) throw new Error(`Mobile overflow: ${event.path}`);
          await page.setViewportSize({ width:1280,height:900 });
        }
      }
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
