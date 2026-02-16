

## Fix Email Delivery: Verify Domain and Update Sender Address

The emails ARE being sent successfully (confirmed in logs), but they're landing in spam because they come from Resend's generic sandbox address `onboarding@resend.dev`. Here's exactly how to fix this:

---

### Step 1: Verify your domain in Resend (you do this manually)

1. Go to [resend.com/domains](https://resend.com/domains) and log in
2. Click **Add Domain**
3. Enter `weddingwaitress.com`
4. Resend will show you DNS records to add (typically MX, TXT/SPF, and DKIM records)
5. Log in to your domain registrar (wherever you bought weddingwaitress.com) and add those DNS records
6. Go back to Resend and click **Verify** -- it can take a few minutes to propagate

### Step 2: Update the Edge Function sender address (I do this)

Once the domain is verified, I will update one line in the `send-auth-email` edge function:

**File:** `supabase/functions/send-auth-email/index.ts`

Change the `from` field from:
```
from: "Wedding Waitress <onboarding@resend.dev>"
```
to:
```
from: "Wedding Waitress <noreply@weddingwaitress.com>"
```

This is the only code change needed. Everything else in the function stays the same.

### Step 3: Check your Resend API key scope

If your current Resend API key was created for the sandbox only, you may need to create a new one scoped to `weddingwaitress.com` and update the `RESEND_API_KEY` secret in Supabase. If your key is already a full-access key, no change is needed.

---

### Immediate Workaround (to sign in right now)

While you set up the domain, please check your **Spam/Junk folder** or Gmail's **Promotions/Updates tabs** for emails from `onboarding@resend.dev` with subject "Sign in to Wedding Waitress". The codes were sent -- they're just being filtered.

