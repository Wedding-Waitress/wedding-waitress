
# Fix Stats Bar — Unreplied Invites Logic

## The Problem

There are currently two misleading stats:

**1. Unsent Invites = 51**
This is technically correct — 51 guests haven't been sent an invite. This number is fine as-is. It simply means "guests who are yet to receive an invitation."

**2. Unreplied Invites = 51 (the real bug)**
Currently it counts ALL guests whose RSVP status is "Pending" — including the 51 guests who were never even sent an invite. That makes no sense. A guest can't "reply" if they never got an invite.

The correct definition of **Unreplied Invites** is:
> Guests who **were sent** an invite (email_sent, sms_sent, or both_sent) but whose RSVP is still "Pending"

With your data: 4 were sent invites, and all 4 replied → Unreplied Invites should be **0**, not 51.

---

## The Fix

### File: `src/pages/Dashboard.tsx` (lines 249–253)

**Current logic:**
```ts
const unrespondedInvites = guests.filter(g => {
  const normalized = normalizeRsvp(g.rsvp);
  return normalized === "Pending";
}).length;
```

**Fixed logic:**
```ts
const unrespondedInvites = guests.filter(g => {
  const wasSent = ['email_sent', 'sms_sent', 'both_sent'].includes(g.rsvp_invite_status || 'not_sent');
  const normalized = normalizeRsvp(g.rsvp);
  return wasSent && normalized === "Pending";
}).length;
```

This means **Unreplied Invites** will only count guests who:
1. Were sent an invite (email, SMS, or both), AND
2. Have not yet replied (still "Pending")

---

## Summary of All 4 Stats After Fix

| Stat | Meaning | Your data |
|---|---|---|
| Sent Invites | Guests who received at least one invite | 4 |
| Unsent Invites | Guests who haven't been sent an invite yet | 51 |
| Replied Invites | Guests who received an invite AND responded (Accept or Decline) | 4 |
| Unreplied Invites | Guests who received an invite BUT haven't responded yet | 0 |

---

## Only 1 File Changed

- `src/pages/Dashboard.tsx` — one line change to `unrespondedInvites` filter logic

No visual changes — numbers will simply now be accurate.
