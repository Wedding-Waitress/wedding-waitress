

## Plan: Add hourglass icon and "To go" text to countdown

### Change (in `src/pages/GuestLookup.tsx`)

Lines 641-643: Update the countdown `<p>` tag to include an `Hourglass` icon on the left and "To go" text on the right.

```tsx
<p className="text-primary font-bold text-sm md:text-base mt-1 flex items-center justify-center gap-1.5">
  <Hourglass className="h-4 w-4" />
  {parts.join(', ')} To go
</p>
```

Also ensure `Hourglass` is added to the lucide-react import at the top of the file.

