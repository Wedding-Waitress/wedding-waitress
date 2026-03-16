

## Fix RSVP Deadline Date Parsing

**Problem**: The `rsvp_deadline` field is stored as text like `"5th, November 2026"` (with ordinal suffix), not as an ISO date. The `formatOrdinalDate` function tries `new Date("5th, November 2026T00:00:00")` which produces `Invalid Date`.

**Solution**: Update `formatOrdinalDate` in `InvitationCardCustomizer.tsx` to detect and handle text-format dates by stripping ordinal suffixes (`st`, `nd`, `rd`, `th`) before parsing.

**File**: `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx` (lines 30-39)

Update `formatOrdinalDate` to:
1. First try parsing as-is (works for ISO dates like `2026-12-20`)
2. If invalid, strip ordinal suffixes from the string (e.g., `"5th, November 2026"` → `"5, November 2026"`), then parse
3. If still invalid, return empty string

```ts
const formatOrdinalDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // Try ISO format first
  let date = new Date(dateStr + 'T00:00:00');
  
  // If invalid, try stripping ordinal suffixes (e.g., "5th, November 2026")
  if (isNaN(date.getTime())) {
    const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
    date = new Date(cleaned);
  }
  
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate();
  const suffix = (day > 3 && day < 21) ? 'th' : (['th', 'st', 'nd', 'rd'][day % 10] || 'th');
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${weekday}, the ${day}${suffix} of ${month} ${year}`;
};
```

No other changes needed.

