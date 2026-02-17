

## Style Updates to Guest Delete Confirmation Modal

### Changes (1 file: `src/components/Dashboard/GuestDeleteConfirmationModal.tsx`)

1. **Title "You are deleting this guest"** -- change text color to Wedding Waitress purple (`text-primary`) and capitalize first letter (already capitalized, so just the color change).

2. **"Guest:" line with the guest name** -- change the text color to purple (`text-primary`).

3. **"Delete Guest" button** -- change from purple (`variant="default"`) to red (`variant="destructive"` or `bg-red-500`), matching the app's destructive action pattern.

### Technical Details

- Title: Add `className="text-primary"` to `DialogTitle`
- Guest line: Change `text-foreground` to `text-primary` on the guest name span, and wrap the "Guest:" label in a purple-colored span
- Delete button: Change to `className="rounded-full bg-red-500 hover:bg-red-600 text-white"`

