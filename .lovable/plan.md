

## Plan: Widen DJ-MC Questionnaire Public View

### What changes
In `src/pages/DJMCPublicView.tsx`, change all four `max-w-4xl` containers to `max-w-7xl` so the shared questionnaire uses the full screen width for viewing. The PDF download logic is in a separate file and remains untouched.

### Technical details

**File: `src/pages/DJMCPublicView.tsx`**

Four changes — all identical:
- Line 517: `max-w-4xl` → `max-w-7xl` (header)
- Line 555: `max-w-4xl` → `max-w-7xl` (event details banner)
- Line 604: `max-w-4xl` → `max-w-7xl` (main content)
- Line 637: `max-w-4xl` → `max-w-7xl` (footer)

No other files or logic touched. PDF export remains A4 format.

