

## Real-Time Ceremony-to-Reception Auto-Sync

### What Changes

**File:** `src/components/Dashboard/EventCreateModal.tsx`

### Current Behavior
The existing `useEffect` only copies Ceremony values into Reception fields once -- when the Reception toggle is switched ON. After that, typing in Ceremony fields does not update Reception fields.

### New Behavior
- As the user fills out each Ceremony field, the corresponding Reception field updates in real time (live sync).
- **Exception:** Start Time and Finish Time will NOT sync from Ceremony to Reception.
- If the user has manually edited a Reception field to something different, that field stops syncing (user override is preserved).
- Each Reception field shows the synced value but can be changed by the user at any time.

### Implementation

1. **Replace the single `useEffect`** (lines 69-86) with a new `useEffect` that watches ALL relevant Ceremony field values (not just `reception_enabled`).

2. **Track user overrides** with a `useState` set (e.g., `receptionOverrides`) so that once a user manually changes a Reception field, it stops being auto-synced from the Ceremony.

3. **Field mapping** (Ceremony -> Reception):
   - `ceremony_name` -> `name`
   - `ceremony_date` -> `date`
   - `ceremony_rsvp_deadline` -> `rsvp_deadline`
   - `ceremony_guest_limit` -> `guest_limit`
   - `ceremony_venue` -> `venue`
   - `ceremony_venue_address` -> `venue_address`
   - `ceremony_venue_phone` -> `venue_phone`
   - `ceremony_venue_contact` -> `venue_contact`
   - `ceremony_start_time` -> NOT synced
   - `ceremony_finish_time` -> NOT synced

4. **Override tracking:** When the user directly edits any Reception field (name, date, venue, etc.), add that field name to the `receptionOverrides` set. The sync effect skips any field in that set.

5. **Reset overrides** when the modal closes or when Ceremony is toggled off, so the next time it starts fresh.

### Technical Detail

```typescript
const [receptionOverrides, setReceptionOverrides] = useState<Set<string>>(new Set());

const markReceptionOverride = (field: string) => {
  setReceptionOverrides(prev => new Set(prev).add(field));
};

// Live sync from Ceremony to Reception
useEffect(() => {
  if (!formData.reception_enabled || !formData.ceremony_enabled) return;
  
  setFormData(prev => {
    const updates: any = {};
    const syncMap: Record<string, string> = {
      ceremony_name: 'name',
      ceremony_date: 'date',
      ceremony_rsvp_deadline: 'rsvp_deadline',
      ceremony_guest_limit: 'guest_limit',
      ceremony_venue: 'venue',
      ceremony_venue_address: 'venue_address',
      ceremony_venue_phone: 'venue_phone',
      ceremony_venue_contact: 'venue_contact',
      // Start Time and Finish Time intentionally excluded
    };
    for (const [srcKey, destKey] of Object.entries(syncMap)) {
      if (!receptionOverrides.has(destKey)) {
        updates[destKey] = (prev as any)[srcKey];
      }
    }
    return { ...prev, ...updates };
  });
}, [
  formData.ceremony_enabled, formData.reception_enabled,
  formData.ceremony_name, formData.ceremony_date,
  formData.ceremony_venue, formData.ceremony_venue_address,
  formData.ceremony_venue_phone, formData.ceremony_venue_contact,
  formData.ceremony_guest_limit, formData.ceremony_rsvp_deadline,
  receptionOverrides
]);
```

Each Reception input's `onChange` handler will call `markReceptionOverride('fieldName')` so the user can override any synced value.

### Files Modified
- `src/components/Dashboard/EventCreateModal.tsx` only
