

## Switch Sender to Verified Domain

### Step 1: Verify your domain in Resend (you do this)

1. Go to [Resend Dashboard → Domains](https://resend.com/domains)
2. Click **Add Domain** and enter `weddingwaitress.com`
3. Resend will give you DNS records (MX, TXT/SPF, DKIM) to add at your domain registrar
4. Add those DNS records and wait for Resend to show the domain as **Verified**
5. Let me know once it says "Verified"

### Step 2: Update the Edge Function (I do this)

Once your domain is verified, I will change one line in `supabase/functions/send-auth-email/index.ts`:

```
from: "Wedding Waitress <onboarding@resend.dev>"
```
to:
```
from: "Wedding Waitress <noreply@weddingwaitress.com>"
```

Then redeploy the edge function. After that, all authentication emails will come from your professional address and should land directly in inboxes rather than spam.

