
# Add "PM" to Default Running Sheet Template Times

## What Changes

Update every `time_text` value in the default template rows to append "PM", matching the format the user wants (e.g., `3.00PM`, `3.30PM`, `4.00PM`).

## Technical Details

### File: `src/hooks/useRunningSheet.ts` (lines 15-27)

Update the `time_text` field on all 13 default rows:

| Before | After |
|--------|-------|
| `3.00` | `3.00PM` |
| `3.30` | `3.30PM` |
| `4.00` | `4.00PM` |
| `4.30` | `4.30PM` |
| `6.00` | `6.00PM` |
| `6.30` | `6.30PM` |
| `7.00` | `7.00PM` |
| `7.30` | `7.30PM` |
| `8.00` | `8.00PM` |
| `8.30` | `8.30PM` |
| `9.00` | `9.00PM` |
| `10.30` | `10.30PM` |
| `11.00` | `11.00PM` |

This only affects newly created running sheets (when "Reset to Default" is used or a new sheet is initialized). Existing sheets already saved in the database will not be changed.
