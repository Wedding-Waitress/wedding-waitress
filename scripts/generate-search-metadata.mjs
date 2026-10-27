import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seoRoutes, SITE_URL, schemaForRoute } from './seo-routes.mjs';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function renderSearchMetadata(template, route, noIndex = false) {
  const canonical = `${SITE_URL}${route.path}`;
  const image = `${SITE_URL}${route.image ?? '/images/public-heroes/home-poster-desktop.jpg'}`;
  let html = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const tags = [
    `<title>${escape(route.title)}</title>`,
    `<meta name="description" content="${escape(route.description)}" data-rh="true">`,
    `<link rel="canonical" href="${escape(canonical)}" data-rh="true">`,
    `<meta name="robots" content="${noIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'}" data-rh="true">`,
    ...Object.entries({ 'og:title': route.title, 'og:description': route.description, 'og:url': canonical, 'og:image': image, 'og:type': route.type, 'og:site_name': 'Wedding Waitress', 'og:locale': 'en_AU' }).map(([key, value]) => `<meta property="${key}" content="${escape(value)}" data-rh="true">`),
    ...Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': route.title, 'twitter:description': route.description, 'twitter:image': image }).map(([key, value]) => `<meta name="${key}" content="${escape(value)}" data-rh="true">`),
    `<script type="application/ld+json" data-rh="true">${JSON.stringify(schemaForRoute(route)).replaceAll('<', '\\u003c')}</script>`,
  ].join('\n    ');
  return html.replace('</head>', `    ${tags}\n  </head>`);
}

export async function generateSearchMetadata(dist = 'dist') {
  const template = await readFile(`${dist}/index.html`, 'utf8');
  const noIndex = Boolean(process.env.CONTEXT && process.env.CONTEXT !== 'production');
  for (const route of seoRoutes) {
    const output = route.path === '/' ? `${dist}/index.html` : `${dist}${route.path}.html`;
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, renderSearchMetadata(template, route, noIndex));
  }
  const redirectsPath = `${dist}/_redirects`;
  const redirects = await readFile(redirectsPath, 'utf8');
  const publicRewrites = seoRoutes.filter(route => route.path !== '/').map(route => `${route.path} ${route.path}.html 200`).join('\n');
  const fallback = /^\/\*\s+\/index\.html\s+200\s*$/m;
  if (!fallback.test(redirects)) throw new Error('Expected SPA fallback before adding public metadata routes');
  await writeFile(redirectsPath, redirects.replace(fallback, `${publicRewrites}\n\n/* /index.html 200`));
  console.log(`Generated initial-response metadata for ${seoRoutes.length} public routes; private routes retain the SPA fallback.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateSearchMetadata();
