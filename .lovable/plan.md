

## Plan: Fix Speeches Section Header Alignment

### Root Cause

The Speeches section header and row both use the same flex structure:

```text
[drag 24px] [Status 31%] [Speaker Name flex-1] [Audio w-10] [Time w-24] [Actions w-16]
```

The headers "Pronunciation Audio" and "Time Allowed" sit in `w-10` (40px) and `w-24` (96px) containers respectively — matching the row elements below. However:

1. The `w-10` (40px) container is too narrow for "Pronunciation Audio" text, causing overflow/visual drift to the left
2. The row's action column uses a dropdown button that may not exactly match the `w-16` spacer in the header, creating an offset
3. The row also has `px-1` padding and `gap-2` spacing that compounds the misalignment

### Solution

**File: `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection.tsx`** (speeches header block, lines 431-442)

- Keep `w-10` for "Pronunciation Audio" header — it must match the recorder width in the row
- Keep `w-24` for "Time Allowed" header — it must match the duration input width in the row  
- Add the same gap/spacing structure as the row to ensure vertical alignment
- Verify the actions spacer (`w-16`) matches the row's action button area (the row uses a `shrink-0` div with a 28px button inside — effectively less than 64px)

The real fix is to adjust the **actions spacer** in the header from `w-16` to match exactly what the row renders (a single 28px button), and potentially widen the audio header slightly if overflow is causing the visual shift. This ensures the fixed-width columns on the right (Audio + Time) stack directly above their row counterparts.

### Changes

1. **Adjust header actions spacer width** — match the row's actual action button width instead of the generic `w-16`
2. **Ensure pronunciation audio and time allowed headers have identical width classes** as their row counterparts (`w-10` and `w-24`)

### No other changes
- No changes to row layout
- No changes to other sections
- No structural changes

