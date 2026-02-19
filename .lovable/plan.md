

# Add Space Between Time and "PM" in Default Template

## What Changes

Add a space between the time number and "PM" in all 13 default Running Sheet template rows.

## Technical Details

### File: `src/hooks/useRunningSheet.ts` (lines 15-27)

Update every `time_text` value:

| Current | Updated |
|---------|---------|
| `3.00PM` | `3.00 PM` |
| `3.30PM` | `3.30 PM` |
| `4.00PM` | `4.00 PM` |
| `4.30PM` | `4.30 PM` |
| `6.00PM` | `6.00 PM` |
| `6.30PM` | `6.30 PM` |
| `7.00PM` | `7.00 PM` |
| `7.30PM` | `7.30 PM` |
| `8.00PM` | `8.00 PM` |
| `8.30PM` | `8.30 PM` |
| `9.00PM` | `9.00 PM` |
| `10.30PM` | `10.30 PM` |
| `11.00PM` | `11.00 PM` |

Same scope as before: applies to newly created sheets and "Reset to Default." Existing saved data is not affected.

