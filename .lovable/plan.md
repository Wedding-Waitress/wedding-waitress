## Replace Portrait/Landscape strip with premium info bar

**File:** `src/components/Dashboard/Signage/SignagePage.tsx` (lines 413–442)

### Change
Replace the entire orientation `<Card>` block with a slimmer informational bar.

### New markup (conceptual)
```tsx
{selectedEventId && settings && !settingsLoading && (
  <div className="rounded-xl border border-[hsl(var(--primary)/0.18)] bg-gradient-to-br from-[hsl(var(--primary)/0.05)] to-[hsl(var(--primary)/0.02)] shadow-soft px-5 py-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
    <p className="text-sm text-foreground/85 font-medium">
      Portrait print layouts optimised for professional wedding signage.
    </p>
    <p className="text-xs text-muted-foreground tracking-wide">
      300 DPI • Australian standard print sizes • Print-shop ready PDFs
    </p>
  </div>
)}
```

### Notes
- Removes the Portrait/Landscape buttons entirely and the `A4 210 × 297mm — designed at print resolution` helper.
- Existing `orientation` variable stays `'portrait'` from settings — no toggle UI, no logic changes elsewhere. `handleOrientationChange` becomes unused (left in place; out of scope to delete).
- No changes to preview canvas, designer tabs, export logic, PDF/PNG/A4 selection, or any other section.
- Responsive: stacks vertically by default, horizontal at `lg:`.
- Styling tokens only (primary tint + muted-foreground) — matches Print & Export Studio panel.
