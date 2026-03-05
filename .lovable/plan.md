

## Plan: Fix QR Code redirect not working

### Root Cause
The `QRRedirect` component uses `fetch()` with `redirect: 'manual'` to call the edge function. However, browsers block access to the `Location` header on opaque redirect responses due to CORS restrictions. This means `response.headers.get('Location')` always returns `null`, so the redirect never happens.

### Fix
Change `QRRedirect.tsx` to navigate the browser directly to the edge function URL instead of using `fetch()`. The browser will natively follow the 302 redirect from the edge function.

### File Change: `src/pages/QRRedirect.tsx`
- Replace the `fetch()` + manual redirect logic with a simple `window.location.href` assignment that points directly to the edge function URL
- The edge function already returns a proper 302 redirect with HTML fallback for errors, so the browser handles everything natively
- Keep the loading spinner UI while the redirect happens
- Keep the error state for missing `code` param only

