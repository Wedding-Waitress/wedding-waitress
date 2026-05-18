In `src/components/Dashboard/Signage/SignagePage.tsx`:

1. Add `useOptimizedPreview` to the existing import from `@/lib/imagePipeline` (keep `transformedUrl` if still used elsewhere; otherwise remove only if unused).
2. Replace the `lightweightBgUrl` `useMemo` block with:
   ```ts
   const { url: lightweightBgUrl } = useOptimizedPreview(
     editorMasterUrl,
     (settings as any)?.background_image_preview_url ?? null,
   );
   ```
3. No other changes.