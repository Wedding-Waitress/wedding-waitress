
## What I found
I checked the actual live file at:

- `https://weddingwaitress.netlify.app/sitemap.xml`
- `https://weddingwaitress.com/sitemap.xml`

Result:
- The live `netlify.app` sitemap already returns `https://weddingwaitress.netlify.app/...` URLs.
- The custom-domain sitemap at `weddingwaitress.com/sitemap.xml` still returns `https://weddingwaitress.com/...` URLs.

So the mismatch is real across domains, but the specific `netlify.app` URL you asked me to confirm is already serving `netlify.app` links.

## Likely cause
There are still hardcoded `.com` references elsewhere in the project, including:
- `public/robots.txt` → points to `https://weddingwaitress.com/sitemap.xml`
- SEO/canonical/schema code in locked public files such as:
  - `src/components/SEO/SeoHead.tsx`
  - `src/pages/BlogPost.tsx`
  - `src/pages/Blog.tsx`
  - other public SEO layout files

That means even if `public/sitemap.xml` is correct, search engines and crawlers can still be pushed toward `.com`, which makes the domain setup look inconsistent.

## Plan
1. Re-check `public/sitemap.xml` and keep all `<loc>` values on `https://weddingwaitress.netlify.app`.
2. Update `public/robots.txt` so its sitemap reference also uses `https://weddingwaitress.netlify.app/sitemap.xml`.
3. Audit and replace remaining hardcoded `https://weddingwaitress.com` SEO/canonical/schema URLs in the public SEO files with `https://weddingwaitress.netlify.app`.
4. Publish/update the frontend so the public site serves the corrected static assets.
5. Verify after publish by checking:
   - `https://weddingwaitress.netlify.app/sitemap.xml`
   - `https://weddingwaitress.netlify.app/robots.txt`
   - key pages’ canonical/schema output
6. If you also want the custom domain to stop showing `.com` URLs, decide whether:
   - the custom domain should remain active, or
   - everything should consistently use `netlify.app`.

## Scope note
Your earlier instruction said “Do not change anything else,” but the current issue is bigger than `sitemap.xml` alone because `robots.txt` and SEO files still reference `.com`. If the goal is a truly consistent live setup, those need to be aligned too.

## Expected outcome
After implementation and publish:
- `https://weddingwaitress.netlify.app/sitemap.xml` serves only `netlify.app` URLs
- crawlers are directed to the same sitemap via `robots.txt`
- canonical/schema URLs stop contradicting the sitemap
- the live deployment is consistent instead of split between `.com` and `netlify.app`
