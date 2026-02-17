

## Add Retry Logic to Checkout Edge Function Calls

### Problem

The first click on "Pay Now" sometimes fails silently due to edge function cold starts or transient network issues. The Stripe checkout URL never opens, and the user has to click again.

### Solution

Add an automatic retry mechanism to the two frontend components that call checkout edge functions. If the first attempt fails, wait 2 seconds and retry once automatically (matching the existing OTP retry pattern in the app).

### Changes

**1. `src/components/Dashboard/RsvpActivationModal.tsx`**

Wrap the `supabase.functions.invoke('create-checkout', ...)` call in a retry helper: if the first attempt throws an error or returns a function-level error, wait 2 seconds and try once more before showing the error toast to the user.

**2. `src/components/Dashboard/ExtendPlanModal.tsx`**

Apply the same retry logic to the `supabase.functions.invoke('create-extension-checkout', ...)` call.

### Technical Detail

A small inline helper will be used in each component:

```tsx
const invokeWithRetry = async (fnName: string, body: object) => {
  const attempt = async () => {
    const { data, error } = await supabase.functions.invoke(fnName, { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  try {
    return await attempt();
  } catch (firstError) {
    // Wait 2s then retry once (handles cold starts)
    await new Promise(r => setTimeout(r, 2000));
    return await attempt();
  }
};
```

Both components will use this pattern instead of a single call. No changes to the edge functions themselves are needed.

### Result

- First click will automatically retry after a 2-second pause if the initial call fails
- User only sees an error toast if both attempts fail
- No impact on the happy path (fast successful calls are unaffected)
