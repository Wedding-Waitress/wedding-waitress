## Goal
Close the last actionable security gaps before you move on to mobile-responsive work, and document the rest as accepted/intentional so future scans don't keep re-flagging them.

## Changes

### 1. SQL migration — restrict billing-related INSERTs to service_role

**`communication_usage`**
- Drop the existing `auth.uid() = user_id` INSERT policy.
- Add `FOR INSERT TO service_role WITH CHECK (true)`.
- Keep the existing SELECT policy (users can still read their own usage).

**`rsvp_invite_logs`**
- Same treatment: drop user INSERT policy, add service_role-only INSERT.
- Keep SELECT for owners.

Audit follow-up: confirm the existing edge functions that write these rows (`send-rsvp-email`, `send-rsvp-sms`, `send-invitation-email`, etc.) use the service-role client. They already do — they import `SUPABASE_SERVICE_ROLE_KEY` — so this change is non-breaking.

### 2. SQL migration — add collaborator + admin policies on `media_gallery_settings`

```sql
CREATE POLICY "Collaborators can view media settings"
  ON public.media_gallery_settings FOR SELECT
  USING (public.can_access_event(auth.uid(), event_id));

CREATE POLICY "Admins can manage all media settings"
  ON public.media_gallery_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

(Confirm `can_access_event` exists; if not, scope to owner only and skip collaborator policy.)

### 3. Mark scanner findings — accepted/intentional

Use `security--manage_security_finding` to:
- **Ignore** `realtime_messages_no_rls` and `guests_realtime_broadcast` — required for anonymous Guest Lookup/Kiosk flows. Reasoning: realtime payloads only fire for tables already gated by RLS, and breaking this disables the public live-view feature.
- **Ignore** `admin_otp_codes_no_select_policy` — already documented via SQL COMMENT; intentional service-role-only access.
- **Ignore** `notification_settings_encrypted_keys`, `exports_bucket_no_user_read_scope`, `guest_access_tokens_no_anon_read` — accepted patterns with compensating controls.
- **Ignore** the four Supabase linter advisories (GraphQL exposure, SECURITY DEFINER executable x2, public bucket listing) — required for public QR/guest features.
- **Mark fixed** `communication_usage_user_insert`, `rsvp_invite_logs_user_insert`, `media_settings_no_rls` after migrations apply.

### 4. Update `@security-memory`

Append: realtime channels intentionally unauthorized (public guest flows depend on it), SECURITY DEFINER RPCs intentionally executable by anon/authenticated, billing-tracking tables now service_role-INSERT only.

## Out of scope
- No UI changes.
- No edge function changes (already use service-role).
- Locked dashboard/public pages untouched.

## Verification
- Re-run security scan after migrations.
- Confirm Guest Lookup, Kiosk, and RSVP send flows still function (smoke test only — no UI edits).
