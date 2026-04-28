## Fix: Restore correct RFC 5322 email "from" format

Revert all 4 Edge Function `from` fields from the broken markdown-link format back to the standard `"Display Name <email@domain>"` format that Resend (and every email service) requires.

### Files to update

1. **`supabase/functions/send-transactional-email/index.ts`** (line 316)
2. **`supabase/functions/send-rsvp-email/index.ts`** (line 123)
3. **`supabase/functions/send-invitation-email/index.ts`** (line 127)
4. **`supabase/functions/send-auth-email/index.ts`** (line 174)

### Change in each file

**From (currently broken):**
```
from: "Wedding Waitress [support@weddingwaitress.com.au](mailto:support@weddingwaitress.com.au)",
```

**To (correct RFC 5322 format):**
```
from: "Wedding Waitress <support@weddingwaitress.com.au>",
```

`reply_to: "support@weddingwaitress.com.au"` stays unchanged in every file. Nothing else will be touched.

### Verification

After editing, I'll run `sed -n` on each line and display the output inside a fenced code block (which preserves `<` and `>` characters so they're visible to you). You'll be able to clearly see the angle brackets and the email address in each of the 4 lines.

### Why this is correct

`"Wedding Waitress <support@weddingwaitress.com.au>"` is the universal email standard (RFC 5322). The recipient's inbox shows the friendly name **Wedding Waitress** and the actual sender address is **support@weddingwaitress.com.au**. This is what Resend requires for proper deliverability and SPF/DKIM alignment with your verified domain.