

## Plan: Fix QR code redirect to use weddingwaitress.com

### Root Cause
The edge function `qr-redirect` redirects to `https://wedding-waitress.lovable.app` (the hardcoded fallback), but your production domain is `weddingwaitress.com`. The `PUBLIC_BASE_URL` secret has never been set. The browser ends up at the Supabase domain showing `{"error":"requested path is invalid"}` because Supabase cannot serve your React app routes.

Your existing event and dynamic QR codes are fully intact -- no need to recreate anything.

### Fix (two changes)

#### 1. Update hardcoded fallback in edge function
**File:** `supabase/functions/qr-redirect/index.ts` (line 100)
- Change fallback from `https://wedding-waitress.lovable.app` to `https://weddingwaitress.com`

#### 2. Set the `PUBLIC_BASE_URL` Supabase secret
- Set `PUBLIC_BASE_URL` = `https://weddingwaitress.com` so the edge function uses the correct production domain

### Result
- QR code scans redirect to `weddingwaitress.com/s/jason-lindas-wedidng` (your working app)
- "Open Live View" button opens the correct URL
- No event or QR code recreation needed

