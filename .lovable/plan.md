
# Fix Stats Bar "Sent Invites" + Guest List RSVP Invite Badge Styling

## Issues Identified

### Issue 1: "Sent Invites" shows wrong number (60 instead of 3)
**Root cause:** `src/pages/Dashboard.tsx` line 239 has a hardcoded incorrect calculation:
```ts
const sentInvites = guests.length; // All guests are considered "sent invites" ← WRONG
const unsentInvites = Math.max(0, eventGuestLimit - guests.length); // WRONG
```
This incorrectly treats every guest as a "sent invite". It should count guests whose `rsvp_invite_status` is `email_sent`, `sms_sent`, or `both_sent`.

**Fix:** Replace both calculations with accurate counts from `rsvp_invite_status`:
```ts
const sentInvites = guests.filter(g =>
  ['email_sent', 'sms_sent', 'both_sent'].includes(g.rsvp_invite_status || 'not_sent')
).length;
const unsentInvites = guests.filter(g =>
  (g.rsvp_invite_status || 'not_sent') === 'not_sent'
).length;
```
This means: **Sent Invites** = guests who received at least one invite. **Unsent Invites** = guests who haven't received any invite yet.

---

### Issue 2: Badge colours — SMS Sent and Email Sent should be purple (not green/blue)
**Root cause:** `src/components/Dashboard/GuestListTable.tsx` lines 1826–1829 uses green for SMS and blue for email:
```ts
'email_sent': { label: 'Email Sent', className: 'bg-blue-500 text-white' },
'sms_sent': { label: 'SMS Sent', className: 'bg-green-500 text-white' },
'both_sent': { label: 'Both Sent', className: 'bg-purple-500 text-white' },
```

**Fix:** Change all three sent statuses to purple to match the brand:
```ts
'email_sent': { label: 'Email Sent', className: 'bg-purple-500 text-white' },
'sms_sent': { label: 'SMS Sent', className: 'bg-purple-500 text-white' },
'both_sent': { label: 'Both Sent', className: 'bg-purple-500 text-white' },
```

---

### Issue 3: RSVP Invite badge text wrapping — should be on one line, centred
**Root cause:** The `TableCell` and `TableHead` for RSVP Invite use `w-24` (96px) which is too narrow for "Email Sent" and "Both Sent". The badge is also not explicitly centred.

**Fix:**
- Widen the RSVP Invite column from `w-24` to `w-32` in both `TableHead` and `TableCell`
- Add `whitespace-nowrap` to the badge so text stays on one line
- Add `flex items-center justify-center` or `text-center` to the cell for centring

---

### Issue 4: Column headers not balanced / touching each other
**Root cause:** The `Mobile` and `Email` headers have excessive left padding (`pl-16`) which pushes content right and creates uneven spacing across columns.

**Fix:**
- Remove or reduce `pl-16` from Mobile and Email headers
- Adjust Mobile and Email `TableCell` padding to match (`pl-16` → `pl-4` or similar)
- This will create a more balanced, evenly-spaced header row

---

## Files to Change

### 1. `src/pages/Dashboard.tsx` (lines ~238–241)
Fix `sentInvites` and `unsentInvites` calculation to use `rsvp_invite_status`.

### 2. `src/components/Dashboard/GuestListTable.tsx` (lines ~1748–1751 and ~1820–1837)
- Widen RSVP Invite column header to `w-32`, remove `pl-16` from Mobile/Email headers
- Change SMS Sent and Email Sent badge colours to purple
- Add `whitespace-nowrap` to badges and centre the cell content
- Adjust Mobile/Email cell padding to be consistent

---

## No functional behaviour changes — only stat accuracy and visual styling.
