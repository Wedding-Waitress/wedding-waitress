

## Two Changes to My Events Page

### Change 1: Restyle the "Start here" indicator in EventsTable.tsx

**File:** `src/components/Dashboard/EventsTable.tsx` (lines 236-243)

**Current:** A small green circle with "1" inside, followed by "Start here by creating & managing your events..." text as muted foreground.

**New:** Remove the green circle with "1". Replace with a green badge/tablet behind the words "Start here" in white text, followed by the rest of the instruction text in normal muted style. Move the text to be left-aligned (it already is).

Replace lines 236-243:
```jsx
<div className="flex items-start gap-2 mt-3">
  <p className="text-xs sm:text-sm text-muted-foreground">
    {isMobile ? "Create & manage events here." : (
      <>
        <span className="bg-green-500 text-white text-xs sm:text-sm font-medium px-2 py-0.5 rounded">Start here</span>
        {" "}by creating & managing your events, then create the number of tables you want in the next "Tables" page.
      </>
    )}
  </p>
</div>
```

This removes the green circle with "1", adds a green tablet/badge behind "Start here" with white text, and keeps the remaining instruction text as-is.

---

### Change 2: Auto-populate Reception fields from Ceremony data

**File:** `src/components/Dashboard/EventCreateModal.tsx`

When the user enables the Reception toggle (or has both enabled), and Ceremony fields have been filled in, auto-populate the corresponding empty Reception fields with the Ceremony values. The user can still override any field.

**Fields to carry over** (only when the Reception field is currently empty/default):
- `ceremony_name` -> `name` (Event Name)
- `ceremony_date` -> `date` (Event Date)
- `ceremony_venue` -> `venue` (Location/Venue)
- `ceremony_venue_address` -> `venue_address`
- `ceremony_venue_phone` -> `venue_phone`
- `ceremony_venue_contact` -> `venue_contact`
- `ceremony_guest_limit` -> `guest_limit`
- `ceremony_start_time` -> `start_time`
- `ceremony_finish_time` -> `finish_time`
- `ceremony_rsvp_deadline` -> `rsvp_deadline`

**Implementation:** Add a `useEffect` that watches for `reception_enabled` turning ON. When it does, copy any filled Ceremony values into the corresponding empty Reception fields. This is a one-time population -- once the user edits a Reception field, it stays as-is.

```typescript
// When reception is toggled ON, pre-fill empty reception fields from ceremony data
useEffect(() => {
  if (formData.reception_enabled && formData.ceremony_enabled) {
    setFormData(prev => ({
      ...prev,
      name: prev.name || prev.ceremony_name,
      date: prev.date || prev.ceremony_date,
      venue: prev.venue || prev.ceremony_venue,
      venue_address: prev.venue_address || prev.ceremony_venue_address,
      venue_phone: prev.venue_phone || prev.ceremony_venue_phone,
      venue_contact: prev.venue_contact || prev.ceremony_venue_contact,
      guest_limit: (prev.guest_limit === '' || prev.guest_limit === 10) ? prev.ceremony_guest_limit : prev.guest_limit,
      start_time: prev.start_time || prev.ceremony_start_time,
      finish_time: prev.finish_time || prev.ceremony_finish_time,
      rsvp_deadline: prev.rsvp_deadline || prev.ceremony_rsvp_deadline,
    }));
  }
}, [formData.reception_enabled]);
```

### Files Modified
- `src/components/Dashboard/EventsTable.tsx` -- "Start here" badge restyle
- `src/components/Dashboard/EventCreateModal.tsx` -- ceremony-to-reception auto-fill

