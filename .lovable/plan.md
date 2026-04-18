
## Root cause
`Dashboard.tsx` line 65 reads `?tab=` from URL **only on initial mount** into local state. When `DashboardHeader` calls `setSearchParams({ tab: 'account' })`, the URL changes but `activeTab` state is never updated → the switch keeps rendering the previous tab. Same bug would affect refresh-on-account if the initial read works (it does — that part is fine), but clicking Account from the dropdown silently fails.

## Fix (1 file, ~5 lines)

**`src/pages/Dashboard.tsx`** — add a sync effect right after the `setActiveTab` declaration:

```tsx
// Keep activeTab in sync when URL ?tab= changes (e.g. from header dropdown)
useEffect(() => {
  const urlTab = searchParams.get('tab') || 'dashboard';
  if (urlTab !== activeTab) setActiveTabState(urlTab);
}, [searchParams, activeTab]);
```

This makes URL the source of truth for tab changes coming from outside the sidebar (header dropdown, browser back/forward, direct refresh).

## Verification (will run before reporting done)
1. Click avatar → Account → page renders instantly, URL = `/dashboard?tab=account`
2. Refresh on `/dashboard?tab=account` → still on Account
3. Browser back → returns to previous tab correctly
4. Sidebar tab clicks still work (they call `setActiveTab` which updates both state + URL)
5. Mobile (375px) — tap avatar → dropdown → Account → renders
6. Console clean, no errors
7. Re-verify the `🔒 PRODUCTION-LOCKED` header on `Dashboard.tsx` and `DashboardHeader.tsx` (add if missing) and confirm Account page lock entries already in `LOCKED_TRANSLATION_KEYS.md`

## Out of scope
Sidebar, all other pages, all other tabs.
