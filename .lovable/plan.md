

## Fix "Bride & Groom" Display and Domain URL

### Issue 1: "Bride & Groom" Text

The guest lookup page (line 490-493 of `GuestLookup.tsx`) currently prioritises showing `partner1_name & partner2_name` over the event name. Your event has the default placeholder values "Bride" and "Groom" in those fields, so it displays "Bride & Groom" instead of "Jason & Linda's Wedding".

**Fix:** Update the logic so it only uses partner names when they are meaningful (not the default "Bride"/"Groom" placeholders). Otherwise, fall back to the event name.

**File: `src/pages/GuestLookup.tsx` (lines 490-493)**

Change from:
```tsx
{event.partner1_name && event.partner2_name 
  ? `${event.partner1_name} & ${event.partner2_name}`
  : event.name
}
```

To:
```tsx
{event.partner1_name && event.partner2_name 
  && event.partner1_name !== 'Bride' && event.partner2_name !== 'Groom'
  ? `${event.partner1_name} & ${event.partner2_name}`
  : event.name
}
```

This way, if the partner names are still the defaults, it shows the event name instead.

**Alternative (simpler):** You could also just update the event itself via the Edit Event modal and change "Bride" to "Jason" and "Groom" to "Linda". That would fix it without any code change. However, the code fix above protects all users from this issue.

### Issue 2: Domain URL (weddingwaitress.com)

This is **not a code change** -- it requires connecting your custom domain to the Lovable project:

1. Go to **Project Settings** (click project name, top-left) then **Domains**
2. Add `weddingwaitress.com` as a custom domain
3. Update your domain's DNS records as instructed (typically a CNAME pointing to Lovable)
4. Once DNS propagates, the URL bar will show `weddingwaitress.com/s/jason-lindas-wedidng`
5. After the domain is live, we change `VITE_PUBLIC_BASE_URL` back to `https://weddingwaitress.com`

A paid Lovable plan is required for custom domains. Until the domain is configured, the URL will continue to show `wedding-waitress.lovable.app`.

