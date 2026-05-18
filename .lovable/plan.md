## Add file-size logging useEffect in SignagePage.tsx

Add a new `useEffect` in `src/components/Dashboard/Signage/SignagePage.tsx` that watches `lightweightBgUrl` and logs the size of the image being loaded into the editor preview.

### Behavior
- Trigger whenever `lightweightBgUrl` changes.
- If `lightweightBgUrl` is null/undefined, do nothing.
- Otherwise, issue `fetch(lightweightBgUrl, { method: 'HEAD' })`, read the `content-length` response header, and log:
  `Editor preview image size: X bytes`
- Wrap in try/catch so a failed HEAD request doesn't break the page.

### Placement
Insert directly after the existing `useOptimizedPreview` block (around line 153–155), so it sits next to the related preview-URL logic. No other code is touched.

### Snippet
```ts
useEffect(() => {
  if (!lightweightBgUrl) return;
  fetch(lightweightBgUrl, { method: 'HEAD' })
    .then((res) => {
      const size = res.headers.get('content-length');
      console.log(`Editor preview image size: ${size} bytes`);
    })
    .catch(() => {});
}, [lightweightBgUrl]);
```

`useEffect` is already imported in this file, so no import changes are needed.