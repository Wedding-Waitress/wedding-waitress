
## Hide Partner Name Options When "Hide Relations" Toggle Is On

### What Changes

**File: `src/components/Dashboard/GuestListTable.tsx` (line 1464)**

Wrap the entire `div.flex.flex-col.gap-3` block (lines 1464-1509+) — which contains the two radio labels ("Leave Partner 1 and Partner 2 names as Bride and Groom" and "Add new names for Partner 1 and Partner 2") plus the custom name inputs below them — in a conditional render:

```
{relationMode !== 'off' && (
  <div className="flex flex-col gap-3">
    ...existing radio labels and custom name inputs...
  </div>
)}
```

When the toggle is switched to red (relation mode = "off"), both radio options and any name input fields below them will disappear. When toggled back (relation mode = "two"), they reappear.

### Technical Detail

- Only the JSX wrapper changes — add `{relationMode !== 'off' && (` before line 1464 and close it after the corresponding `</div>`
- No database or logic changes needed; the `relationMode` state variable already tracks "off" correctly
