

## Update Base URL to weddingwaitress.com

Your custom domain `weddingwaitress.com` is confirmed live. The only change needed is updating the environment variable back to your custom domain so all QR codes, links, and the Live View open correctly under `weddingwaitress.com`.

### Change

**File: `.env`**

Update `VITE_PUBLIC_BASE_URL` from `https://wedding-waitress.lovable.app` back to `https://weddingwaitress.com`

This fixes:
- QR codes will point to `weddingwaitress.com/s/event-slug`
- "Open Live View" will open `weddingwaitress.com/s/event-slug`
- "Copy Link" will copy the correct custom domain URL

### Important Note

After this change, you will need to **Publish** the project for the updated URL to take effect on the live site. Backend changes deploy automatically, but frontend `.env` changes require a publish.

