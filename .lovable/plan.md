
# Fix QR Code URLs - Domain Configuration Issue

## Problem Identified

The QR codes are generating links to `weddingwaitress.com/s/reema-hossam` but that domain doesn't exist (DNS error `DNS_PROBE_FINISHED_NXDOMAIN`).

**Root Cause:** The environment variable `VITE_PUBLIC_BASE_URL` is set to `https://weddingwaitress.com` but this domain is not connected/configured.

**Your working URL is:** `https://wedding-waitress.lovable.app`

---

## Solution Options

### Option A: Use Your Existing Lovable Domain (Quick Fix)

Update the environment variable to use your working domain:

**File:** `.env`
```
VITE_PUBLIC_BASE_URL="https://wedding-waitress.lovable.app"
```

This will make QR codes generate working links immediately.

---

### Option B: Configure Custom Domain `weddingwaitress.com` (If You Own This Domain)

If you want to use `weddingwaitress.com`, you need to:

1. **Purchase/own the domain** `weddingwaitress.com` from a registrar (GoDaddy, Namecheap, Cloudflare, etc.)

2. **Add DNS records** at your domain registrar:
   - **A Record** for `@` (root domain): `185.158.133.1`
   - **A Record** for `www`: `185.158.133.1`
   - **TXT Record** for `_lovable`: (Lovable will provide the verification value)

3. **Connect the domain in Lovable:**
   - Go to Project Settings → Domains
   - Click "Connect Domain"
   - Enter `weddingwaitress.com`
   - Follow the verification steps

4. **Wait for DNS propagation** (up to 72 hours)

---

## Recommended Action

**For immediate fix:** I'll update the `.env` file to use `https://wedding-waitress.lovable.app`

**After this change:**
- All QR codes will generate working links
- Existing QR codes pointing to `weddingwaitress.com` will need to be regenerated/reprinted
- You can later switch to a custom domain after configuring it properly

---

## Files to Change

| File | Change |
|------|--------|
| `.env` | Update `VITE_PUBLIC_BASE_URL` to `https://wedding-waitress.lovable.app` |

---

## Do You Want Option A or Option B?

- **Option A (Quick fix)**: Approve this plan and I'll update the environment variable
- **Option B (Custom domain)**: You'll need to configure DNS at your domain registrar first - this is not a code change
