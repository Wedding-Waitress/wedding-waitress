const SITE_URL = 'https://weddingwaitress.com.au';

const entries = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/how-it-works', changefreq: 'monthly', priority: '0.9' },
  { path: '/features', changefreq: 'monthly', priority: '0.9' },
  { path: '/products', changefreq: 'monthly', priority: '0.9' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.9' },
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },
  { path: '/my-events', changefreq: 'monthly', priority: '0.9' },
  { path: '/guest-list', changefreq: 'monthly', priority: '0.9' },
  { path: '/tables', changefreq: 'monthly', priority: '0.9' },
  { path: '/qr-code-seating-chart', changefreq: 'monthly', priority: '0.9' },
  { path: '/invitations-cards', changefreq: 'monthly', priority: '0.9' },
  { path: '/name-place-cards', changefreq: 'monthly', priority: '0.9' },
  { path: '/individual-table-charts', changefreq: 'monthly', priority: '0.9' },
  { path: '/floor-plan', changefreq: 'monthly', priority: '0.9' },
  { path: '/dietary-requirements', changefreq: 'monthly', priority: '0.9' },
  { path: '/full-seating-chart', changefreq: 'monthly', priority: '0.9' },
  { path: '/kiosk-live-view', changefreq: 'monthly', priority: '0.9' },
  { path: '/dj-mc-questionnaire', changefreq: 'monthly', priority: '0.9' },
  { path: '/running-sheet', changefreq: 'monthly', priority: '0.9' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/contact', changefreq: 'yearly', priority: '0.4' },
  { path: '/cookies', changefreq: 'yearly', priority: '0.3' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/blog/qr-code-wedding-seating-chart-australia', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/wedding-signage-cost-australia', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/how-to-create-qr-code-seating-chart', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/digital-wedding-seating-chart-accessibility', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/last-minute-wedding-seating-changes', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/why-australian-couples-switching-qr-seating-charts-2026', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/why-every-wedding-needs-a-running-sheet', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/how-to-create-a-wedding-seating-chart-step-by-step', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/wedding-seating-chart-etiquette-who-sits-where', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/best-wedding-seating-chart-templates-australia', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/common-wedding-seating-chart-mistakes', changefreq: 'monthly', priority: '0.7' },
];

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

await Bun.write('public/sitemap.xml', xml);
console.log(`Generated public/sitemap.xml with ${entries.length} ${SITE_URL} URLs`);
