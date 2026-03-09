

## Plan: Add "Home" button at bottom of Table visualization view

### Change (in `src/pages/GuestLookup.tsx`)

Add a purple "Home" button at the bottom of the `visualization` TabsContent, after the table visualization grid and before the closing `</div>` of `space-y-6`. This button will appear when a guest has searched their name and is viewing their table assignment. Clicking it will reset the view back to the `search` tab.

Insert after line 825 (after the closing `</>` of the filtered guests block), before line 826:

```tsx
{/* Home button */}
<div className="flex justify-center mt-4">
  <button
    onClick={() => setActiveTab('search')}
    className="px-8 py-3 rounded-full bg-primary text-white font-semibold text-sm shadow-md hover:opacity-90 transition-all"
  >
    Home
  </button>
</div>
```

Single addition, no other changes.

