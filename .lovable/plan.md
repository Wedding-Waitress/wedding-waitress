

## Scalability Assessment: Wedding Waitress Backend

### Your Scenario
- 100 weddings/day, 100–500 guests each = up to **50,000 concurrent QR scans** in peak bursts (e.g. "everyone scan now" moments at multiple weddings simultaneously)
- Up to ~1M total guest interactions per day

### What's Already Built Well

1. **QR Redirect Edge Function** — lightweight, stateless, fires the scan log asynchronously (non-blocking). This is the correct pattern.
2. **`resolve_dynamic_qr` is a SECURITY DEFINER function** — bypasses RLS overhead, uses a direct indexed lookup on `dynamic_qr_codes.code` (UNIQUE constraint = automatic B-tree index). Fast.
3. **`events.slug` has a unique index** — the guest lookup page query resolves quickly.
4. **Scan logs are fire-and-forget** — the redirect returns immediately without waiting for the INSERT to complete.

### Potential Bottlenecks & Recommended Fixes

#### 1. Missing Index on `dynamic_qr_codes(code, is_active)`
The `resolve_dynamic_qr` function filters on both `code` AND `is_active = true`. The current UNIQUE index is only on `code`. A composite index would eliminate an extra filter step under load.

**Fix**: Add a composite index:
```sql
CREATE INDEX idx_dynamic_qr_codes_code_active 
ON public.dynamic_qr_codes(code) WHERE is_active = true;
```

#### 2. Missing Index on `qr_scan_logs(event_id)`
Scan logs are inserted with `event_id` but there's no index on it. Analytics queries filtering by event will do full scans as the table grows to millions of rows.

**Fix**:
```sql
CREATE INDEX idx_qr_scan_logs_event_id ON public.qr_scan_logs(event_id);
```

#### 3. `get_public_event_with_data_secure` — The Real Hot Path
This is the function called when a guest lands on the Live View page. It joins `events`, `guests`, `live_view_settings`, `live_view_module_settings`, and `guest_access_tokens` — returning **every guest for the event**. For a 500-guest wedding, this returns 500 rows per page load.

**Concerns**:
- If 500 guests scan simultaneously, that's 500 calls each returning 500 rows = **250,000 rows transferred in seconds**
- Missing indexes on `guests(event_id)` and `live_view_settings(event_id)` would compound this

**Fix**: Add covering indexes if missing:
```sql
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON public.guests(event_id);
CREATE INDEX IF NOT EXISTS idx_live_view_settings_event_id ON public.live_view_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_live_view_module_settings_event_id ON public.live_view_module_settings(event_id);
```

#### 4. Supabase Edge Function Concurrency Limits
Supabase Edge Functions on the **Pro plan** support up to ~500 concurrent connections by default. At peak (multiple weddings doing "scan now" at once), you could hit this limit.

**Mitigation**: The QR redirect is fast (~50ms) so connections cycle quickly. But you should:
- Monitor edge function invocation metrics in the Supabase dashboard
- Consider upgrading to a higher compute add-on if you see throttling
- The Supabase Pro plan handles this workload comfortably; the Free plan would not

#### 5. Database Connection Pooling
Each edge function invocation creates a Supabase client. Supabase uses PgBouncer for connection pooling (default 60 connections on Pro). Under extreme burst load, connection exhaustion is possible.

**Mitigation**: Already handled by Supabase infrastructure — the SDK uses the REST API (PostgREST), not direct Postgres connections, so this is a non-issue for your RPC calls. You're in good shape here.

#### 6. `qr_scan_logs` Table Growth
At 1M scans/day, this table grows by ~30M rows/month. Without cleanup, analytics queries will slow down over time.

**Future consideration**: Add a retention policy or partitioning (not urgent for launch, but plan for it within 3–6 months).

### Summary Verdict

| Component | Status | Action Needed |
|-----------|--------|---------------|
| QR Redirect Edge Function | Solid | None |
| `resolve_dynamic_qr` lookup | Good | Add partial index on `(code) WHERE is_active` |
| Scan log INSERT | Good (async) | Add `event_id` index |
| Guest Lookup page data | Functional but heavy | Add covering indexes, monitor |
| Edge Function concurrency | Fine on Pro plan | Monitor during peak |
| Connection pooling | Non-issue (REST API) | None |
| Scan log table growth | Future risk | Plan retention policy post-launch |

**Bottom line**: Your architecture is sound for launch. The QR redirect path is lean and fast. The main risk is the guest lookup RPC under simultaneous burst load — but with proper indexes (which I'd add via a migration), Supabase Pro handles your 1M/day scenario without issues. The system will work. I'd recommend adding the indexes above as a pre-launch hardening step.

Shall I proceed with a migration to add these indexes?

