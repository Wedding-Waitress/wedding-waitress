
Goal: verify the DJ-MC “Share with DJ/MC” flow end-to-end (create link → open link → view questionnaire) and fix the remaining breakage in a way that won’t regress other production-ready features.

What I found (from code + DB inspection)
- Frontend route exists in current code: `src/App.tsx` has `"/dj-mc/:token" → <DJMCPublicView />` above the catch-all route.
- Public page `src/pages/DJMCPublicView.tsx` renders:
  - “Link Unavailable” when the token is invalid/expired or not found (this is expected).
  - It does not require login (public).
- Share link tokens in DB currently include base64 padding `=` at the end (example: `...O8=`). Many chat apps / copy flows sometimes strip trailing `=` characters, which would make the token not match the DB record and cause “Link Unavailable”. This is a strong candidate for “link doesn’t work” even if routing is correct.
- Permissions for the relevant RPCs look OK right now (they are SECURITY DEFINER and `anon` has execute privileges).

Primary fixes to implement (safe + backwards-compatible)
1) Make tokens resilient to “padding stripped” links (main functional fix)
   - Update the RPC `get_dj_mc_questionnaire_by_token(share_token text)` to accept:
     - exact token match, and
     - the same token with padding re-applied (handle `=` and `==` cases).
   - This makes shared links work even if the receiver’s app removed trailing `=` during copy/paste.

   Implementation approach (DB)
   - In the function’s WHERE clause, change token lookup from:
     - `st.token = share_token`
     to something like:
     - `st.token = share_token OR st.token = share_token || '=' OR st.token = share_token || '=='`
   - Keep the rest of the function logic unchanged to avoid regressions.

2) Stop generating padded tokens going forward (prevents recurrence)
   - Update `public.generate_dj_mc_share_token` to strip `=` padding after base64url conversion (while keeping the current `extensions.gen_random_bytes` fix).
   - This produces cleaner share URLs and reduces the chance of copy/paste corruption.

3) Ensure frontend always constructs URLs safely
   - In `src/components/Dashboard/DJMCQuestionnaire/DJMCShareModal.tsx`:
     - Build share URLs using `encodeURIComponent(token)` for:
       - clipboard copy URL
       - “Open in new tab” link
   - This prevents any future token character edge cases from breaking the path segment.

4) Optional but recommended: add a route alias for old/alternate paths (prevents 404 confusion)
   - In `src/App.tsx`, add an additional route:
     - `/djmc/:token` → `<DJMCPublicView />`
   - This protects you if “when it was working” you ever used a different path format, and it costs almost nothing.

End-to-end test checklist (what I will run after implementing)
A) Token creation (host/dashboard)
- Go to Dashboard → DJ-MC Questionnaire tab.
- Select an event.
- Click “Share with DJ/MC” → “Generate & Copy Link”.
- Confirm:
  - Success toast appears
  - “Manage (n)” increments and the new token appears

B) Public open (guest/DJ)
- Paste the copied link into a new incognito window.
- Confirm:
  - It does not 404
  - It loads the questionnaire (or at minimum shows the DJMC public header + sections)

C) Real-world copy robustness tests
- Test the same link with padding removed manually:
  - remove the trailing `=` from the URL token and load again
  - expected: still works (because of DB-side normalization)
- If route alias is added, test:
  - `/djmc/<token>` also works

Scope boundaries / safety
- No changes to locked modules (Place Cards / Full Seating Chart).
- DB changes are narrowly limited to DJMC share functions only.
- Changes are backwards-compatible (existing tokens and possibly “trimmed” tokens will work).

Files/areas that will be changed (implementation phase after approval)
- Supabase migration(s):
  - Update `public.get_dj_mc_questionnaire_by_token` to normalize/accept stripped padding tokens
  - Update `public.generate_dj_mc_share_token` to generate unpadded tokens going forward
- Frontend:
  - `src/components/Dashboard/DJMCQuestionnaire/DJMCShareModal.tsx` (encodeURIComponent when building URLs)
  - `src/App.tsx` (optional `/djmc/:token` alias route)

Completion criteria
- A newly generated share link opens successfully on the public page.
- The same link still opens if trailing `=` padding is removed.
- No 404 for DJMC share links.
