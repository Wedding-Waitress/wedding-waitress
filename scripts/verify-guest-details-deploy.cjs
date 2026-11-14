// HTTP/artifact verification only; this is not a browser or exact-SMS-link test.
const fs = require('node:fs');
const crypto = require('node:crypto');
const base = process.argv[2];
if (!base || !/^https:\/\/(?:weddingwaitress\.com\.au|[a-z0-9-]+--weddingwaitress\.netlify\.app)$/.test(base)) throw Error('Expected the production or preview Wedding Waitress origin');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
(async () => {
  const response = await fetch(`${base}/s/hossam-reemas-wedding`, { redirect: 'manual' });
  if (response.status !== 200) throw Error(`Guest route returned ${response.status}`);
  const html = await response.text();
  const expectedHtml = fs.readFileSync('work/guest-details-release/index.html', 'utf8');
  const main = html.match(/src="(\/assets\/index-[^"]+\.js)"/)[1];
  if (!expectedHtml.includes(main)) throw Error('Unexpected release entry asset');
  const jsResponse = await fetch(base + main);
  const js = await jsResponse.text();
  const localMain = fs.readFileSync('work/guest-details-release' + main);
  if (jsResponse.status !== 200 || sha(js) !== sha(localMain)) throw Error('Entry asset mismatch');
  const guestName = js.match(/GuestLookup-[A-Za-z0-9_-]+\.js/)[0];
  const guestResponse = await fetch(`${base}/assets/${guestName}`);
  const guest = await guestResponse.text();
  if (guestResponse.status !== 200 || sha(guest) !== sha(fs.readFileSync(`work/guest-details-release/assets/${guestName}`))) throw Error('Guest asset mismatch');
  for (const marker of ['get_guest_details_form_authorized','save_guest_details_form_authorized','can_manage_guest_details','Update My Details']) if (!guest.includes(marker)) throw Error('Missing deployed guest editor contract');
  console.log(JSON.stringify({ origin: base, routeStatus: response.status, entryAssetMatches: true, guestAssetMatches: true, guestEditorContractsPresent: true, browserTest: false, exactSmsTest: false }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
