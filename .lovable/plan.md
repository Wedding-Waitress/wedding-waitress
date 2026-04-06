

## Improve "Manage Selected Guests" Modal + Add Manual Invite Option

### Overview
Enhance the bulk actions modal with selected guest names, reorganized layout, updated labels, and a new "Mark Invite as Sent Manually" option with a dropdown for manual invite tracking.

### File 1: `src/components/Dashboard/GuestBulkActionsBar.tsx` — Full rewrite

**New props:**
- Add `selectedGuests: Array<{ id: string; first_name: string; last_name: string }>` to show guest names
- Add `onMarkManualInvite: (method: string) => void` callback for manual invite status updates

**Header redesign:**
- Title stays "Manage Selected Guests"
- Replace badge with dynamic text: if 1 guest, show "Selected: [First Last]"; if 2-3, show comma-separated names; if 4+, show "X guests selected"
- Move "Select All / Deselect All" toggle button to the right side of this header row (inline, not a separate action row)

**Action rows (new order):**
1. Update RSVP (existing)
2. Send Email via Wedding Waitress (renamed, Mail icon)
3. Send SMS via Wedding Waitress (renamed, Phone icon)
4. Mark Invite as Sent Manually — new row with a `Select` dropdown inside it containing: "Sent via Email", "Sent via SMS", "Sent via Physical Mail". When user picks an option, fire `onMarkManualInvite` with the corresponding status value
5. Delete Guests (danger styled, bottom)

**Footer:** Keep Cancel button as-is.

**Manual invite dropdown mapping:**
- "Sent via Email" → `email_sent`
- "Sent via SMS" → `sms_sent`
- "Sent via Physical Mail" → `mail_sent`

### File 2: `src/components/Dashboard/GuestListTable.tsx`

**Pass new props to GuestBulkActionsBar (~line 2155):**
- Add `selectedGuests={sortedGuests.filter(g => selectedGuestIds.has(g.id)).map(g => ({ id: g.id, first_name: g.first_name, last_name: g.last_name }))}`
- Add `onMarkManualInvite` handler that:
  1. Iterates over `selectedGuestIds`
  2. Updates each guest's `rsvp_invite_status` in Supabase to the selected value
  3. Shows success toast
  4. Clears selection and refetches guests

**Update RSVP Invite status display (~line 1978):**
- Add `'mail_sent'` to the `statusConfig` map: `{ label: 'Sent (Mail)', className: 'bg-purple-500 text-white' }`

### Technical Details

- The `rsvp_invite_status` column already exists in the `guests` table (type: `string`, values: `not_sent`, `email_sent`, `sms_sent`, `both_sent`)
- Adding `mail_sent` as a new status value for physical mail — no migration needed since the column is a plain text/string field
- The manual invite handler will use `supabase.from('guests').update({ rsvp_invite_status: method }).eq('id', guestId)` for each selected guest

