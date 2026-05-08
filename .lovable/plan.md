## Guest Intelligence Centre — Phase 1 Architecture

Replace the current placeholder side panel inside `GuestListTable.tsx` with a premium, modular accordion-driven Intelligence panel. No new pages, no routing changes, no duplication of Communications Centre analytics.

### Scope
- File touched (UI integration): `src/components/Dashboard/GuestListTable.tsx` (only the `showIntelligencePanel` block, ~lines 3099–3131).
- New folder: `src/components/Dashboard/GuestIntelligence/` for modular sections.
- No DB migrations. Pure client-side derivations from already-loaded `guests` + `tables` + `selectedEvent`.

### New Component Structure
```
src/components/Dashboard/GuestIntelligence/
  GuestIntelligencePanel.tsx          // shell: header + accordion container + close
  IntelligenceSection.tsx             // reusable accordion item (title, icon, badge, children)
  InsightCard.tsx                     // reusable summary chip/row (label, value, tone)
  sections/
    RsvpIntelligenceSection.tsx
    RelationshipIntelligenceSection.tsx
    DietaryIntelligenceSection.tsx
    SeatingIntelligenceSection.tsx
    EngagementIntelligenceSection.tsx
    SmartRecommendationsSection.tsx
    ActivityTimelineAccessSection.tsx
  lib/
    computeGuestInsights.ts           // pure derivations from guests/tables
```

Each section receives `{ guests, tables, event }` and renders its own light insight rows. Sections are independently swappable later (Phase 2 can add backend-derived insights without touching siblings).

### Panel Shell (UI)
- Slide-in side panel: `w-full sm:w-[520px] lg:w-[560px]`, white surface, `border-l border-[#E8E1D6]`, soft shadow.
- Header: "Event Intelligence Overview" + 1-line muted description + close `×`.
- Optional 3-chip "at a glance" row (Total Guests · Confirmed · Pending) — derived only, no comm metrics.
- Body: shadcn `Accordion type="multiple"` with the 7 sections, all collapsed by default except RSVP Intelligence.
- Smooth scrolling, generous spacing (`space-y-3`), consistent brand tokens (`#1D1D1F`, `#6E6E73`, `#967A59`, `#FBF7F2`).
- Mobile: full-width sheet, accordions stack, 16px padding, sticky header.

### Section Content (Phase 1 — lightweight derivations only)

1. **RSVP Intelligence** — Confirmed / Pending / Declined counts + response rate %, "X guests still pending" warning chip. (No delivery KPIs — those stay in Communications Centre.)
2. **Relationship Intelligence** — Breakdown by `relation_partner` (Partner 1 vs Partner 2 balance) and top relation roles; flag imbalance >70/30.
3. **Dietary Intelligence** — Counts per dietary tag, % of confirmed guests with dietary needs, "Top requirement" highlight.
4. **Seating Intelligence** — Assigned vs Unassigned, tables near capacity (≥90%), empty tables, over-capacity warnings.
5. **Engagement Intelligence** — Lightweight signal mix from existing fields only: `rsvp_invite_status` summary (sent vs not-sent), guests with email vs mobile coverage. No open/click duplication.
6. **Smart Recommendations** — Rule-based suggestions derived from above (e.g. "12 guests unassigned — open Tables", "8 pending RSVPs past midpoint to event date — consider a reminder", "3 dietary needs without table assignment").
7. **Guest Activity Timeline Access** — Short explainer + a single CTA "Open per-guest timeline" that surfaces the existing `GuestActivityTimeline` component for a chosen guest (via a small guest picker). Keeps the previously-built timeline reachable without duplicating it globally.

### Reusable Primitives
- `InsightCard`: `{ label, value, tone?: 'neutral'|'positive'|'warning'|'info', hint? }` — small rounded card, brand colors.
- `IntelligenceSection`: wraps shadcn `AccordionItem` with icon + title + optional count badge + children slot.

### Derivation Rules (in `computeGuestInsights.ts`)
- Use `normalizeRsvp` from `src/lib/rsvp.ts` for status counts.
- Response rate = (Confirmed + Declined) / Total.
- Table capacity uses `tables.limit_seats` vs guests with matching `table_id`.
- All derivations memoized (`useMemo`) inside the panel.

### Anti-Duplication Guardrails
- No delivery, open, click, bounce, resend, or send-success metrics (those live in `SmartRsvpAnalyticsPanel` / Communications Centre).
- No global activity feed — only per-guest access via existing `GuestActivityTimeline`.
- No new realtime subscriptions; reuses already-loaded props.

### Integration Step
Replace lines ~3099–3131 in `GuestListTable.tsx` with:
```tsx
<GuestIntelligencePanel
  open={showIntelligencePanel}
  onClose={() => setShowIntelligencePanel(false)}
  guests={guests}
  tables={tables}
  event={selectedEvent}
/>
```

### Out of Scope (Phase 1)
- Backend RPCs / aggregations
- AI-generated insights (Phase 2 hook point reserved in `SmartRecommendationsSection`)
- Cross-event benchmarks
- Editing actions inside the panel (read-only insights only)

### Responsive
- Desktop: 520–560px right-docked panel.
- Tablet: 480px.
- Mobile: full-width with sticky header, scrollable body, accordion-stacked sections.

### Deliverable
A modular, premium, clutter-free Guest Intelligence Centre side panel scaffolded for independent section evolution, with zero overlap against Communications Centre.