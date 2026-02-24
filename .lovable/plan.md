

# Fix Running Sheet Public View

## Issues to Fix

### 1. Event column is empty (Critical)
The `extractPlainText` function assumes TipTap JSON format (looking for `.content` arrays), but the actual data format is `{ text: "...", bullets: [...], subText: "..." }`. This mismatch means no text is ever extracted. The fix is to replace `extractPlainText` with the same `buildEventDisplay` logic used in the dashboard's `RunningSheetRow.tsx`.

### 2. Update header text
Currently shows:
- **"Jason and Linda's Wedding"** (bold)
- "Running Sheet" (small text below)

Change to:
- "You have been invited to view or print the running sheet of" (smaller introductory text)
- **"Jason and Linda's Wedding"** (bold event name below)

### 3. URL format
The URL currently uses the raw share token (a long random string). Unfortunately, the token is the security mechanism -- it cannot be replaced with the event name as that would break the secure token-based access system. The token must stay in the URL for security. This cannot be changed without compromising the sharing security model.

---

## File Changed

**`src/pages/RunningSheetPublicView.tsx`**

| Change | Detail |
|--------|--------|
| Fix `extractPlainText` | Replace with `buildEventDisplay` that handles `{ text, bullets, subText }` format |
| Update header | Change from "Event Name / Running Sheet" to "You have been invited to view or print the running sheet of / Event Name" |

### Technical Details

Replace the `extractPlainText` function (lines 47-61) with:

```typescript
function buildEventDisplay(rich: any): string {
  if (!rich || typeof rich === 'string') return rich || '';
  const parts: string[] = [];
  if (rich.text) parts.push(rich.text);
  if (Array.isArray(rich.bullets)) {
    rich.bullets.forEach((b: string) => parts.push('- ' + b));
  }
  if (rich.subText) parts.push(rich.subText);
  return parts.join('\n');
}
```

Update the header section (lines 151-158) from:
```
<h1>Event Name</h1>
<p>Running Sheet</p>
```
To:
```
<p>You have been invited to view or print the running sheet of</p>
<h1>Event Name</h1>
```

