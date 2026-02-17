

## Fix: Decouple Event Type (Box 2) from Hide Relations Toggle (Box 3)

### Problem

Both boxes share a single `relationMode` state (`'two'`, `'single'`, or `'off'`). When you click "Wedding Or Engagement" in box 2, it sets `relationMode` to `'two'`, which overrides the `'off'` state from box 3 -- making the hidden partner fields reappear.

### Solution

Introduce a separate `eventType` state to track which event type is selected (box 2), independent from whether relations are hidden (box 3). The `relationMode` saved to the database will be derived from both:
- If relations are hidden: save `'off'`
- If relations are visible: save the `eventType` value (`'two'` or `'single'`)

### Changes (all in `src/components/Dashboard/GuestListTable.tsx`)

**1. Add new state variable**

Add `eventType` state (default `'two'`) alongside the existing `relationMode`:
```
const [eventType, setEventType] = useState<'two' | 'single'>('two');
const [relationsHidden, setRelationsHidden] = useState(false);
```

**2. Update initialization (useEffect around line 531)**

When loading from DB:
- If `relation_mode` is `'off'`: set `relationsHidden = true`, keep `eventType` as whatever it was (or default `'two'`)
- If `relation_mode` is `'two'` or `'single'`: set `relationsHidden = false`, set `eventType` to that value

**3. Update box 2 button clicks (lines 1417, 1430)**

Change from `handleRelationModeChange('two')` / `handleRelationModeChange('single')` to a new handler that:
- Sets `eventType` locally
- Only updates `relation_mode` in DB if relations are NOT hidden (i.e., saves `'two'` or `'single'`)
- If relations ARE hidden, just update `eventType` locally (no DB change -- it stays `'off'`)

**4. Update box 2 button styling (lines 1420, 1433)**

Change `relationMode === 'two'` to `eventType === 'two'` (and same for `'single'`) so the green highlight reflects the event type regardless of whether relations are hidden.

**5. Update box 3 toggle (line 1456-1457)**

Change the switch to use `relationsHidden` instead of `relationMode === 'off'`. When toggled:
- ON (hide): save `'off'` to DB
- OFF (show): save the current `eventType` value to DB

**6. Update conditional rendering (line 1464)**

Change `relationMode !== 'off'` to `!relationsHidden`.

**7. Update partner name validation (line 1208)**

Use `relationsHidden` and `eventType` instead of `relationMode` for checking which names are required.

