

## Revert Sender Address to Sandbox

**File:** `supabase/functions/send-auth-email/index.ts`

One-line change: revert the `from` field back to `onboarding@resend.dev` so emails flow again while Resend's dashboard is down.

```
from: "Wedding Waitress <noreply@weddingwaitress.com>"
```
back to:
```
from: "Wedding Waitress <onboarding@resend.dev>"
```

Once Resend's dashboard recovers and you verify your domain, we can switch it back to `noreply@weddingwaitress.com`. Remember to check your **spam/junk folder** for the code after this change.

