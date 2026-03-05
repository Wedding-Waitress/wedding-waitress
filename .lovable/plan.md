

## Plan: Set PUBLIC_BASE_URL secret in Supabase

The edge function code is already updated with `https://weddingwaitress.com` as the fallback. The one remaining step:

### Set the Supabase secret
- Add secret `PUBLIC_BASE_URL` = `https://weddingwaitress.com` to the Supabase project
- This ensures the edge function always redirects QR scans to your production domain
- No code changes needed -- just the secret

After this, your existing QR codes and "Open Live View" will work correctly, redirecting to `weddingwaitress.com/s/jason-lindas-wedding`.

