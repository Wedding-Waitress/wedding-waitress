## Smart RSVP & Messaging — Consolidation into Guest List

Goal: Make the Guest List page the single command centre for RSVP + messaging, strip RSVP duplication from the Dashboard overview, and add a premium analytics layer.

---

### 1. Dashboard Overview cleanup (`src/components/Dashboard/DashboardOverview.tsx`)

Remove RSVP operational duplication:
- "Activate RSVP Invitations" empty-state card
- "RSVP Allowance" active card (capacity, progress bar, Send Invitations button)
- Over-limit alert card
- Quick Stats row (Total / Sent / Pending / Attending / Not Attending)
- Mini insight line
- Related imports/state (`useRsvpPurchase`, `RsvpOverageModal`, stats memo, `goToGuestList`)

Keep:
- Page header ("Dashboard" + subtitle)
- Event selector card
- "Select an event…" empty state
- Replace removed area with a single muted placeholder card: *"Business analytics coming soon."*

Sidebar, routing, `Dashboard.tsx` shell untouched.

---

### 2. Premium Feature Strip on Guest List

New component: `src/components/Dashboard/SmartRsvpFeatureStrip.tsx`
- Four pill cards: **RSVP Command Centre**, **Communications Centre**, **Delivery Centre**, **Guest Intelligence Centre**
- Small lucide icons (Send, MessageSquare, Truck, Sparkles), thin border, soft `bg-muted/30`, no heavy shadow, generous padding
- Layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3`
- Each pill scrolls/anchors to the corresponding section (Step 2 send, SMS history, analytics panel, resend modal)

Mounted **below the top stats summary bar and above Step 1/2/3 cards**. Locked desktop table block untouched.

---

### 3. Inline delivery badges in "RSVP Status" cell (all devices)

New component: `src/components/Dashboard/GuestDeliveryBadges.tsx`
- Ultra-compact pill: `text-[10px] leading-none px-1.5 py-0.5 rounded-full border`
- Variants:
  - Method: Email (blue), SMS (indigo), Email+SMS (slate)
  - Delivery: Delivered (green), Pending (amber), Failed (red)
  - Response: Responded (emerald)
- Derives from `guest.rsvp_invite_status`, `guest.rsvp_invite_method` (fallback to purchase `delivery_method`), normalized `rsvp`
- Space-priority order when constrained: **method → delivery status → responded**
- Renders inline as trailing pills with `inline-flex flex-wrap gap-1 ml-2 align-middle`, single-line where possible

Integration (no new column, no colgroup/width change, no row-height inflation):
- **Desktop** `GuestListTable.tsx` — append `<GuestDeliveryBadges />` inside the existing **RSVP Status** cell, after the existing status indicator
- **Tablet/Mobile** `GuestMobileCard.tsx` — append in the existing RSVP status row

Locked desktop table colgroup, widths, header row, group header rows, First Name alignment, Send RSVP & Invite column — all preserved.

---

### 4. "Smart RSVP Analytics" button + slide-over

- New button placed in the Guest List controls row near Search / Sort / Import-Export, label **"Smart RSVP Analytics"**, with `lv-premium-shade` class
- New component: `src/components/Dashboard/SmartRsvpAnalyticsPanel.tsx` — Sheet (slide-over from right, `sm:max-w-3xl`)
- Per-guest table columns: Name, Method, Email/Phone, Sent at, Delivery status, RSVP response, Failed/blocked, Resend count, Credits used, Response at
- Built on existing `useMessagingAnalytics` + read-only join of `guests` + `sms_send_logs` + `rsvp_invite_purchases`
- Search input, method filter (`all|email|sms|both`), sort by sent date / status
- Existing `DeliveryAnalyticsPanel` becomes the KPI summary at the top of the Sheet; no longer rendered inline (keeps Guest List visually lighter)

---

### 5. Branding pass

Rename copy (no logic changes) in:
- `RsvpActivationModal.tsx`, `SmsLogsHistory.tsx`, `ResendSmartRsvpModal.tsx`, new components

Standard labels:
- "Smart RSVP & Messaging"
- "Smart RSVP Analytics"
- "Smart RSVP Delivery History" (replaces "SMS Logs"/"Message History" titles)
- "Smart RSVP Tracking"

---

### 6. Out of scope / untouched

- Locked desktop Guest List table layout (colgroup, widths, row structure, Send RSVP & Invite column)
- Step 1/2/3 cards
- Sidebar, routing, RSVP payment + Stripe flow
- Twilio/SMS credit logic
- Snapshot-protected files, public landing/blog/legal pages

---

### Files

| Action | File |
|---|---|
| Strip RSVP widgets | `src/components/Dashboard/DashboardOverview.tsx` |
| New feature strip | `src/components/Dashboard/SmartRsvpFeatureStrip.tsx` |
| New badges | `src/components/Dashboard/GuestDeliveryBadges.tsx` |
| New analytics sheet | `src/components/Dashboard/SmartRsvpAnalyticsPanel.tsx` |
| Mount strip + button + inline badges | `GuestListTable.tsx`, `GuestMobileCard.tsx` |
| Rename copy | `RsvpActivationModal.tsx`, `SmsLogsHistory.tsx`, `ResendSmartRsvpModal.tsx` |

No DB migrations — uses existing `delivery_method`, `sms_send_logs`, `rsvp_invite_purchases`, and `get_event_messaging_analytics` RPC.