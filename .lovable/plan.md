

## Make All Stats Bar Icons and Numbers Purple

A simple styling update to the `StatsBar` component to change every stat item (icon, label, and number) to the Wedding Waitress purple color.

### What Changes

**File: `src/components/Dashboard/StatsBar.tsx`**

- Remove all individual `color` properties from each stat item (currently a mix of `text-destructive`, `text-blue-600`, `text-green-500`, `text-orange-500`, `text-muted-foreground`, `text-pink-500`, `text-amber-600`)
- Set every stat item's color to `"text-primary"` (the Wedding Waitress purple)
- This automatically applies to all pages that use the `StatsBar` component (Guest List, Tables, etc.) since they all share the same component

### Technical Detail

Each of the 10 stat items in the `statItems` array will have its `color` field changed to `"text-primary"`. The labels will also be updated from `text-muted-foreground` to `text-primary font-bold` so all text matches purple. No other files need changing since the `StatsBar` is a single shared component.

