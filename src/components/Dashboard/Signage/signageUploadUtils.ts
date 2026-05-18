import { supabase } from '@/integrations/supabase/client';
import { GalleryUploadProgressHandler, getTransformedPublicUrl, uploadLargeFileToStorage } from '../galleryUploadCore';

export const MAX_SIGNAGE_UPLOAD_BYTES = 500 * 1024 * 1024;

// Tiny preview thumbnail (used by the bulk uploader so we never decode a
// 100 MB JPEG just to show a 48px row preview).
export const createPreviewThumbnail = async (file: File, maxSize = 96): Promise<string | null> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('preview decode failed'));
      img.src = objectUrl;
    });
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longest > maxSize ? maxSize / longest : 1;
    const w = Math.max(1, Math.round(image.naturalWidth * scale));
    const h = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export interface SignageUploadResult {
  masterBytes: number;
  thumbBytes: number;
}

export const prettifySignageFilename = (filename: string) => {
  const noExt = filename.replace(/\.[^.]+$/, '');
  return noExt
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const randomToken = () => Math.random().toString(36).slice(2, 10);

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `signage-${Date.now()}`;

const extensionForFile = (file: File) => {
  const ext = file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return ext === 'jpeg' ? 'jpg' : ext;
  return file.type === 'image/jpeg' ? 'jpg' : 'png';
};

const createThumbnailBlob = async (file: File): Promise<Blob | null> => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read image for thumbnail'));
      img.src = objectUrl;
    });

    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longest > 800 ? 800 / longest : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.75));
  } catch (error) {
    console.warn('Signage thumbnail generation skipped', error);
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const uploadSignageGalleryImage = async (
  file: File,
  name: string,
  category: string,
  onProgress?: GalleryUploadProgressHandler,
): Promise<SignageUploadResult> => {
  if (file.size > MAX_SIGNAGE_UPLOAD_BYTES) {
    throw new Error(`File is larger than 500 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`);
  }

  const slug = slugify(name);
  const stamp = Date.now();
  const token = randomToken();
  const masterPath = `originals/${slug}-${stamp}-${token}.${extensionForFile(file)}`;
  const thumbPath = `thumbs/${slug}-${stamp}-${token}.jpg`;
  const uploadedPaths: string[] = [];

  onProgress?.({ phase: 'validating', percent: 0, message: 'Preparing image upload…' });
  await uploadLargeFileToStorage('signage-gallery', masterPath, file, onProgress);
  uploadedPaths.push(masterPath);

  const masterUrl = supabase.storage.from('signage-gallery').getPublicUrl(masterPath).data.publicUrl;
  // Never use Supabase image transforms as thumbnail — they fail silently on large source images.
  // Default to the master public URL; replace with a real client-generated thumbnail when possible.
  let thumbUrl: string | null = masterUrl;
  let thumbBytes = 0;

  const thumbnailBlob = await createThumbnailBlob(file);
  if (thumbnailBlob) {
    const thumbUpload = await supabase.storage.from('signage-gallery').upload(thumbPath, thumbnailBlob, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (thumbUpload.error) {
      console.warn('Signage thumbnail upload skipped', thumbUpload.error);
    } else {
      uploadedPaths.push(thumbPath);
      thumbUrl = supabase.storage.from('signage-gallery').getPublicUrl(thumbPath).data.publicUrl;
      thumbBytes = thumbnailBlob.size;
    }
  }

  const { data: maxRow } = await supabase
    .from('signage_gallery_images' as any)
    .select('sort_order')
    .eq('category', category)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (((maxRow as any)?.sort_order ?? -1) as number) + 1;
  const { data: insertedRow, error: insertError } = await supabase
    .from('signage_gallery_images' as any)
    .insert({
      name,
      category,
      image_url: masterUrl,
      thumbnail_url: thumbUrl,
      sort_order: sortOrder,
    })
    .select('id')
    .single();

  if (insertError || !insertedRow) {
    if (uploadedPaths.length) await supabase.storage.from('signage-gallery').remove(uploadedPaths);
    throw insertError ?? new Error('Insert failed');
  }

  try {
    const imageId = (insertedRow as unknown as { id: string }).id;
    await replaceImageCategories(imageId, [category || 'Uncategorized']);
  } catch (assignErr) {
    console.warn('Signage category assignment failed', assignErr);
  }

  return {
    masterBytes: file.size,
    thumbBytes,
  };
};

const slugifyCategory = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';

// Single-category enforcement: always wipe existing rows, then insert at most one.
export const assignCategoriesToImage = async (imageId: string, categoryNames: string[]) => {
  const unique = Array.from(new Set(categoryNames.map((c) => c.trim()).filter(Boolean)));
  if (!unique.length) return;
  const name = unique[0];

  let categoryId: string | null = null;
  const { data: upserted, error: upsertErr } = await supabase
    .from('signage_categories' as any)
    .upsert({ name, slug: slugifyCategory(name) }, { onConflict: 'name' })
    .select('id')
    .single();
  if (!upsertErr && (upserted as any)?.id) {
    categoryId = (upserted as any).id;
  } else {
    const { data: existing } = await supabase
      .from('signage_categories' as any)
      .select('id')
      .eq('name', name)
      .maybeSingle();
    if ((existing as any)?.id) categoryId = (existing as any).id;
  }
  if (!categoryId) return;

  await supabase.from('signage_image_categories' as any).delete().eq('image_id', imageId);
  await supabase
    .from('signage_image_categories' as any)
    .insert({ image_id: imageId, category_id: categoryId });
  // Sync legacy text column so the image disappears from its previous category instantly
  await supabase
    .from('signage_gallery_images' as any)
    .update({ category: name })
    .eq('id', imageId);
};

export const replaceImageCategories = async (imageId: string, categoryNames: string[]) => {
  await supabase.from('signage_image_categories' as any).delete().eq('image_id', imageId);
  if (categoryNames.length) {
    await assignCategoriesToImage(imageId, categoryNames);
  } else {
    await supabase
      .from('signage_gallery_images' as any)
      .update({ category: 'Uncategorized' })
      .eq('id', imageId);
  }
};