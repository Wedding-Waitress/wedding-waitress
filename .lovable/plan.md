

## 7-Day Free Trial + One-Time Extension

This plan updates the free trial from 1 day to 7 days and adds a subtle "Need more time?" one-time extension option on the trial expiry popup.

---

### 1. Update Trial Duration to 7 Days

Change the Starter plan's `duration_days` from 1 to 7 in the database via a migration.

### 2. Track One-Time Extension

Add a column `trial_extended` (boolean, default false) to the `user_subscriptions` table. When a user clicks "Need more time?", this flag is set to true and `expires_at` is pushed forward by 7 days. The extension link only appears when `trial_extended` is false.

### 3. Update the Plan Expired Modal

Modify `PlanExpiredModal.tsx` to:
- Show the main upgrade prompt (as it already does)
- At the very bottom, in small muted text: "Need more time?" as a subtle text link
- Clicking it calls an update to extend the trial by 7 days and sets `trial_extended = true`
- Show a brief toast confirmation: "Your trial has been extended by 7 days"
- On second expiry, the modal appears again but **without** the extension link

### 4. Extension Logic in useUserPlan

Update `useUserPlan.ts` to also fetch `trial_extended` from `user_subscriptions` so the modal knows whether to show the extension option.

---

### Technical Details

**Database migration:**
- `UPDATE subscription_plans SET duration_days = 7 WHERE name = 'Starter';`
- `ALTER TABLE user_subscriptions ADD COLUMN trial_extended boolean NOT NULL DEFAULT false;`

**Files to modify:**
- `src/components/Dashboard/PlanExpiredModal.tsx` -- Add the subtle "Need more time?" text link at the bottom, conditionally shown when `trialExtended` is false. On click, update the subscription's `expires_at` by +7 days and set `trial_extended = true`.
- `src/hooks/useUserPlan.ts` -- Fetch and expose `trial_extended` from `user_subscriptions` so the modal can decide whether to show the extension option.
- `src/pages/Dashboard.tsx` -- Pass `trialExtended` to the `PlanExpiredModal`.

**Extension flow:**
1. User's 7-day trial expires, they log in
2. `PlanExpiredModal` appears with upgrade options
3. At the bottom in small text: "Need more time?" (clickable)
4. Click triggers: `UPDATE user_subscriptions SET expires_at = now() + interval '7 days', trial_extended = true, status = 'active', is_read_only = false WHERE user_id = X`
5. Modal closes, toast shows "Trial extended by 7 days"
6. After second expiry, modal shows again but without the extension link -- upgrade is the only option

