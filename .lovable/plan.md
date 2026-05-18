# Fix: 500 MB uploads on Seating Chart Signs gallery only

## Root cause (verified)

I checked all three layers you asked about:

1. **`signage-gallery` bucket `file_size_limit`** — already **500 MB** (524288000 bytes). Verified via `storage.buckets`. ✅
2. **App code limits** — `MAX_SIGNAGE_UPLOAD_BYTES = 500 * 1024 * 1024` in `signageUploadUtils.ts`, modal + bulk uploader both gate at 500 MB. No 50 MB check anywhere in the Signage path. ✅
3. **Edge functions** — `optimize-signage-image` is **not called** by the signage upload flow (single or bulk). The flow goes browser → TUS resumable → Supabase Storage directly. ✅

That leaves one layer the agent **cannot** change from code or SQL:

4. **Project-level "Upload file size limit"** in Supabase Storage settings. On the Pro plan this defaults to **50 MB** and silently overrides every bucket's `file_size_limit`. This is the source of the "object exceeded the current storage limit" 413 you're seeing.

Reference: Supabase Storage docs — *"The global file size limit is configurable in the dashboard under Storage → Settings. The per-bucket limit cannot exceed the global limit."*

## What I will do (code)

**Nothing.** The signage code path is already correct for 500 MB:
- 500 MB bucket limit
- 500 MB client gate
- TUS resumable upload (`uploadLargeFileToStorage`) with 6 MB chunks
- Image Transformations for thumbnails on files > 40 MB (no client decode)

Invitations and Place Cards stay untouched.

## What you need to do (one-time, ~30 seconds)

Open the Supabase dashboard and raise the **global** upload size limit:

```text
Supabase Dashboard
 └─ Project: xytxkidpourwdbzzwcdp
     └─ Storage  →  Settings  (or "Configuration")
         └─ "Upload file size limit"  →  change from 50 MB to 500 MB  →  Save
```

Direct link is included below. After saving, retry a > 50 MB file on the Seating Chart Signs gallery — Single Upload and Bulk Upload will both work immediately. No deploy, no code change, no migration.

## How to verify

1. Open Seating Chart Signs → Image Gallery → Single Upload
2. Pick any PNG/JPG between 50 MB and 500 MB
3. Progress bar should run to 100%, gallery refreshes with the new image
4. Repeat with Bulk Upload (5 large files) — all should succeed

If a file > 50 MB still fails with the same "exceeded the current storage limit" message after you raise the global limit, send me a screenshot of the Storage Settings page and I'll dig further — but per Supabase's documented behavior, raising that one number is the fix.

## Why not just raise it from code

The global Storage limit lives in Supabase's internal config service, not in `storage.buckets` and not in any SQL-accessible table. There is no SQL, no migration, and no admin API exposed to the Lovable agent that can change it. It is dashboard-only (or via the Supabase Management API with a personal access token, which we don't have).

<presentation-actions>
<presentation-link url="https://supabase.com/dashboard/project/xytxkidpourwdbzzwcdp/settings/storage">Open Storage Settings</presentation-link>
</presentation-actions>
