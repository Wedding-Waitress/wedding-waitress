
# Update Edit Event Modal Button Styles

## Change
Update the Cancel and Save Changes buttons in the Edit Event modal footer to match the app-wide form action button standard:

- **Cancel**: Red background (`bg-red-500`) with white text (`text-white`)
- **Save Changes**: Green background (`bg-green-500`) with white text (`text-white`)

## File Modified
**`src/components/Dashboard/EventEditModal.tsx`** (lines 595-609)

- Cancel button: change `variant="outline"` to `variant="destructive"` and add `className="rounded-full bg-red-500 hover:bg-red-600 text-white"`
- Save Changes button: change `variant="gradient"` to `variant="default"` and add `className="rounded-full bg-green-500 hover:bg-green-600 text-white"`

This matches the existing pattern used in the Event Create Modal and other form actions throughout the app.
