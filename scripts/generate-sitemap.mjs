import { seoRoutes } from './seo-routes.mjs';
import { writeFile } from 'node:fs/promises';
import { EOL } from 'node:os';

const SITE_URL = 'https://weddingwaitress.com.au';

const entries = seoRoutes.map(({ path }) => ({ path, changefreq: path === '/' || path === '/blog' ? 'weekly' : 'monthly', priority: path === '/' ? '1.0' : '0.8' }));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    ({ path, changefreq, priority }) => `  <url>
    <loc>${SITE_URL}${path === '/' ? '/' : path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

await writeFile('public/sitemap.xml', xml.replace(/\r?\n/g, EOL), 'utf8');
console.log(`Generated public/sitemap.xml with ${entries.length} ${SITE_URL} URLs`);
