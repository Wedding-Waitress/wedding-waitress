## Plan

I will fix only the Seating Chart Sign image gallery upload flow.

### What I found
- The single and bulk upload buttons currently send the entire image as Base64 inside an Edge Function request.
- High-resolution PNG/JPG files become much larger when converted to Base64, so the request can fail before the optimizer even runs.
- The single upload also requires manual name and category fields, so selecting one file alone can leave the action disabled or appear like nothing happened.
- The deployed function has no recent successful upload records, and the signage gallery table is still empty.

### Fix
1. **Change the upload architecture**
   - Upload each selected image directly to the existing `signage-gallery` Supabase Storage bucket first.
   - Then call `optimize-signage-image` with the uploaded storage path instead of sending Base64.
   - The Edge Function will download that stored source file, convert it to:
     - full-resolution JPG Q92 print master
     - 800px JPG thumbnail
   - Then it will save the gallery row.

2. **Make single upload work with one selected image**
   - Auto-fill the design name from the filename.
   - Auto-fill or default the category so the button does not silently stay unusable.
   - Keep clear toast errors if anything is still missing.

3. **Make bulk upload clearer and safer**
   - Keep the category validation.
   - Show per-file failures clearly.
   - Reduce parallel upload pressure if needed so large image processing is more reliable.

4. **Deploy and validate the Edge Function**
   - Deploy the updated `optimize-signage-image` function.
   - Test that it returns helpful errors instead of failing silently.

### Expected result
- You do **not** need to resize the images one by one.
- You do **not** need to refresh or publish just to make preview uploads work after the fix is implemented.
- After implementation, selecting one image should visibly upload/optimize or show a clear error message.