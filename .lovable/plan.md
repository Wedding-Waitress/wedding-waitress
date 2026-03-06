

## Plan: Deploy the qr-redirect edge function and verify

### Current Status
- **Code**: Already fixed. `supabase/functions/qr-redirect/index.ts` line 100 uses `https://weddingwaitress.com` as the fallback.
- **Secret**: `PUBLIC_BASE_URL` was never set, but it's not needed -- the hardcoded fallback covers it.
- **Problem**: The edge function likely needs to be **redeployed** so the updated code is live.

### Steps
1. **Redeploy** the `qr-redirect` edge function so the updated fallback URL takes effect in production.
2. **Test** by invoking the function with your existing QR code (`HKBJra`) to confirm it returns a 302 redirect to `https://weddingwaitress.com/s/jason-lindas-wedidng`.

### Result
- All existing QR codes and "Open Live View" links will redirect to `weddingwaitress.com` instead of the old Lovable preview domain.
- No secret configuration needed -- the code handles it.

