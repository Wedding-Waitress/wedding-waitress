

# Fix Enter Key in Event Column

## The Problem

The Event column uses a round-trip conversion: textarea text goes through `parseEventText()` (which structures it into a rich object), then back through `buildEventDisplay()` (which reconstructs display text). On line 46, `parseEventText` calls `.trim()` which strips trailing newlines -- so when you press Enter, the new line is immediately removed on re-render.

Time and Who columns store their values as plain strings with no parsing, so Enter works fine for them.

## The Fix

**File:** `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`

**Line 46** -- remove `.trim()` from the mainLines join:

Change:
```
const result: any = { text: mainLines.join('\n').trim() };
```
To:
```
const result: any = { text: mainLines.join('\n') };
```

This single change preserves the newlines the user types, allowing Enter to create new lines in the Event column just like Time and Who.

