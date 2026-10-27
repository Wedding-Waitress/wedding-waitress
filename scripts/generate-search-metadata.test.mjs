import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSearchMetadata, generateSearchMetadata } from './generate-search-metadata.mjs';
import { seoRoutes } from './seo-routes.mjs';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const template = '<html><head><title>Old</title><meta name="description" content="Old"><link rel="canonical" href="https://wrong.invalid/"><script type="application/ld+json">{"offers":{"price":0,"priceCurrency":"USD"}}</script></head><body><div id="root"></div><script src="/assets/app.js"></script></body></html>';

test('each public route gets unique, truthful initial metadata and preserves the app shell', () => {
  assert.equal(new Set(seoRoutes.map(route => route.path)).size, seoRoutes.length);
  assert.equal(new Set(seoRoutes.map(route => route.title)).size, seoRoutes.length);
  for (const route of seoRoutes) {
    const html = renderSearchMetadata(template, route);
    assert.equal((html.match(/<title>/g) ?? []).length, 1);
    assert.ok(html.includes(`https://weddingwaitress.com.au${route.path}`));
    assert.ok(html.includes('<div id="root"></div>'));
    assert.ok(html.includes('/assets/app.js'));
    assert.ok(!html.includes('wrong.invalid'));
    assert.ok(!html.includes('priceCurrency'));
    JSON.parse(html.match(/application\/ld\+json[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert.ok(!/^\/(dashboard|account|admin|s)(\/|$)/.test(route.path));
  }
});

test('previews remain noindex and metadata escapes HTML', () => {
  const html = renderSearchMetadata(template, { ...seoRoutes[0], title: 'A < B & "C"' }, true);
  assert.ok(html.includes('A &lt; B &amp; &quot;C&quot;'));
  assert.ok(html.includes('noindex,nofollow'));
});

test('build routing preserves existing redirects and private SPA fallback', async () => {
  const dist = await mkdtemp(join(tmpdir(), 'ww-seo-'));
  try {
    await writeFile(`${dist}/index.html`, template);
    await writeFile(`${dist}/_redirects`, '/old /new 301\n/* /index.html 200\n');
    await generateSearchMetadata(dist);
    const rules = await readFile(`${dist}/_redirects`, 'utf8');
    assert.ok(rules.startsWith('/old /new 301'));
    assert.ok(rules.includes('/pricing /pricing.html 200'));
    assert.ok(rules.trim().endsWith('/* /index.html 200'));
    assert.ok((await readFile(`${dist}/pricing.html`, 'utf8')).includes('Wedding Planning Software Pricing'));
  } finally { await rm(dist, { recursive: true, force: true }); }
});

test('each public route preloads its existing matching hero, never the previous route image', async () => {
  const { existsSync } = await import('node:fs');
  const manifest = await readFile('src/config/publicHeroManifest.ts', 'utf8');
  for (const route of seoRoutes) {
    const html = renderSearchMetadata(template, route);
    const preloads = [...html.matchAll(/<link\b[^>]*data-ww-hero-preload[^>]*>/g)].map(match => match[0]);
    assert.equal(preloads.length, route.path === '/' ? 2 : 1, route.path);
    for (const preload of preloads) {
      const file = preload.match(/href="([^"]+)"/)[1];
      assert.ok(existsSync(`public${file}`), `${route.path}: missing ${file}`);
      assert.ok(preload.includes('type="image/avif"'));
      if (route.path !== '/') {
        const id = file.split('/').pop().replace('.avif', '');
        const key = route.path.startsWith('/blog/') ? '/blog/:slug' : route.path;
        assert.ok(manifest.includes(`'${key}': asset('${id}'`), `${route.path}: hero does not match manifest`);
      }
    }
    const replaced = renderSearchMetadata(html, seoRoutes.find(page => page.path === '/products'));
    assert.equal((replaced.match(/data-ww-hero-preload/g) ?? []).length, 1);
    assert.ok(replaced.includes('href="/images/public-heroes/products.avif"'));
  }
});
