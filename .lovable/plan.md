

## Plan: Fix QR code redirect pointing to wrong domain

### Root Cause
The `qr-redirect` edge function determines the redirect URL using `PUBLIC_BASE_URL` env var, falling back to `url.origin`. Since `PUBLIC_BASE_URL` is not set and the browser navigates directly to the Supabase function URL (no Origin header), the redirect goes to `xytxkidpourwdbzzwcdp.supabase.co/s/...` instead of `wedding-waitress.lovable.app/s/...`.

### Fix (two parts)

#### 1. Hardcode the app URL in the edge function as fallback
In `supabase/functions/qr-redirect/index.ts`, change the `publicBaseUrl` fallback from `origin` to the published app URL, so it always redirects to the correct domain even without the env var.

#### 2. Set the `PUBLIC_BASE_URL` secret
Add the Supabase secret `PUBLIC_BASE_URL` = `https://wedding-waitress.lovable.app` as a proper configuration.

### Result
- Existing events and QR codes will work immediately without recreating anything
- Both "Open Live View" and phone QR scans will redirect to the correct app domain

