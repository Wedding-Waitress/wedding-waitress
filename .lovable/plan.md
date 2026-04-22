

## Root Cause

The edge function logs reveal the actual error: **`Cannot read properties of null (reading 'replace')`**. This happens at line 33 of `supabase/functions/create-checkout/index.ts`:

```ts
const authHeader = req.headers.get("Authorization")!;
const token = authHeader.replace("Bearer ", "");  // ← authHeader is null
```

The Authorization header is missing from the request. `supabase.functions.invoke()` only attaches the user's JWT automatically when an active session exists in the client. The user's session is either expired or wasn't picked up by `invoke()` at the moment of the click, so the function receives no token and crashes — the frontend then shows the generic "Edge Function returned a non-2xx status code" toast.

Stripe itself, the price IDs, and the publishable key are all fine — the request never reaches Stripe.

## Plan

### 1. Frontend: explicitly attach the session JWT (`src/pages/UpgradeCheckout.tsx`)
Before calling `supabase.functions.invoke('create-checkout', …)`:
- Call `supabase.auth.getSession()`.
- If no session, show a clear error in the right-hand panel ("Please sign in again to continue") and offer a "Sign in" button that routes to the auth flow.
- If a session exists, pass it explicitly via the `headers` option:
  ```ts
  supabase.functions.invoke('create-checkout', {
    body: { … },
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  ```
This guarantees the token reaches the edge function even if the SDK's auto-injection misses it.

### 2. Edge function: graceful auth failure (`supabase/functions/create-checkout/index.ts`)
Replace the unsafe non-null assertion with a proper guard so the function never crashes on a null header and returns a meaningful 401:
```ts
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: "Not authenticated. Please sign in again." }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
const token = authHeader.replace("Bearer ", "");
```
Also surface the underlying Stripe/auth error message in the JSON response (already done) so future failures are diagnosable from the toast.

### 3. Frontend: show the real error message in the right-hand panel
Currently `UpgradeCheckout.tsx` only writes the error to state when an exception is thrown locally. When `supabase.functions.invoke` returns a non-2xx, surface `data?.error || error.message` in the panel (not just the toast) so the user can see why checkout failed instead of a blank box.

### 4. Verify end-to-end
- Reload `/dashboard/upgrade/checkout?plan=essential` while signed in.
- Confirm the embedded Stripe form mounts on the right with the A$99 line item.
- Repeat for Premium (A$149), Unlimited (A$249), Vendor Pro (A$249/mo).
- Sign out, revisit the URL: confirm the friendly "Please sign in again" message appears instead of a blank panel.

## Out of Scope
- No UI / layout / copy / styling changes to the pricing cards or summary panel.
- No changes to price IDs, plan list, `upgradePlans.ts`, or `stripePrices.ts`.
- No Stripe dashboard / tax / GST configuration changes (those live in the Stripe dashboard).
- No changes to `verify_jwt` in `config.toml` (current `false` is correct — we validate the JWT in code).

