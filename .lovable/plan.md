I confirmed the current source already has `GuestMediaUpload` statically imported and `/gallery/:token` is public, outside dashboard/auth routes, and above `path="*"`. Since the live production URL still renders the app’s own 404, I will make a route-only hardening change in `src/App.tsx`:

1. Move `/gallery/:token` to the very top of the `<Routes>` list, immediately before `/`, so it is impossible for any later route group or catch-all to take precedence.
2. Keep `GuestMediaUpload` as a normal static import, not `lazy()`.
3. Do not touch QR code, database, dashboard UI, hooks, `GuestMediaUpload.tsx`, `public/_redirects`, or locked pages.
4. Verify after the change that:
   - `/gallery/:token` remains above `path="*"`.
   - It is not nested inside any protected/dashboard/auth route.
   - `GuestMediaUpload` is included by static import.
   - The exact production URL is checked again; if production still shows 404 before publishing, I will report that the source is fixed and the live bundle still needs Publish/Update.