

## Fix QR Code and Open Live View Links

### The Problem

The QR code and "Open Live View" button both generate URLs using `weddingwaitress.com` -- but that domain does not exist (DNS error). Your app is actually published at `wedding-waitress.lovable.app`.

### The Fix

**File: `.env`** -- Update one line:

Change `VITE_PUBLIC_BASE_URL` from `https://weddingwaitress.com` to `https://wedding-waitress.lovable.app`

This single change fixes:
- QR codes will scan and open correctly
- "Open Live View" button will work
- "Copy Link" will copy the correct URL
- All guest lookup links across the app

### Why This Happened

The `.env` file was configured with a custom domain (`weddingwaitress.com`) that hasn't been set up with DNS. Until that custom domain is configured and pointing to your app, the published Lovable URL must be used instead.

### After the Fix

Once you purchase and configure the `weddingwaitress.com` domain to point to your Lovable app, you can change it back. But for now, using the working Lovable URL will make everything function correctly.

