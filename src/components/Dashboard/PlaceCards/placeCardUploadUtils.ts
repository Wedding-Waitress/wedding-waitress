import { supabase } from '@/integrations/supabase/client';

export const MAX_PLACE_CARD_UPLOAD_BYTES = 500 * 1024 * 1024;

export interface PlaceCardUploadResult {
  masterBytes: number;
  thumbBytes: number;
}

export const prettifyPlaceCardFilename = (filename: string) => {
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
    .slice(0, 80) || `place-card-${Date.now()}`;

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
    console.warn('Place card thumbnail generation skipped', error);
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const uploadPlaceCardGalleryImage = async (
  file: File,
  name: string,
  category: string,
): Promise<PlaceCardUploadResult> => {
  if (file.size > MAX_PLACE_CARD_UPLOAD_BYTES) {
    throw new Error(`File is larger than 500 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`);
  }

  const slug = slugify(name);
  const stamp = Date.now();
  const token = randomToken();
  const masterPath = `originals/${slug}-${stamp}-${token}.${extensionForFile(file)}`;
  const thumbPath = `thumbs/${slug}-${stamp}-${token}.jpg`;
  const uploadedPaths: string[] = [];

  const masterUpload = await supabase.storage.from('place-card-gallery').upload(masterPath, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (masterUpload.error) throw masterUpload.error;
  uploadedPaths.push(masterPath);

  const masterUrl = supabase.storage.from('place-card-gallery').getPublicUrl(masterPath).data.publicUrl;
  let thumbUrl: string | null = null;
  let thumbBytes = 0;

  const thumbnailBlob = await createThumbnailBlob(file);
  if (thumbnailBlob) {
    const thumbUpload = await supabase.storage.from('place-card-gallery').upload(thumbPath, thumbnailBlob, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (thumbUpload.error) {
      console.warn('Place card thumbnail upload skipped', thumbUpload.error);
    } else {
      uploadedPaths.push(thumbPath);
      thumbUrl = supabase.storage.from('place-card-gallery').getPublicUrl(thumbPath).data.publicUrl;
      thumbBytes = thumbnailBlob.size;
    }
  }

  const { data: maxRow } = await supabase
    .from('place_card_gallery_images')
    .select('sort_order')
    .eq('category', category)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (((maxRow as any)?.sort_order ?? -1) as number) + 1;
  const { data: insertedRow, error: insertError } = await supabase
    .from('place_card_gallery_images')
    .insert({
      name,
      category,
      image_url: masterUrl,
      thumbnail_url: thumbUrl,
      sort_order: sortOrder,
    } as any)
    .select('id')
    .single();

  if (insertError || !insertedRow) {
    if (uploadedPaths.length) await supabase.storage.from('place-card-gallery').remove(uploadedPaths);
    throw insertError ?? new Error('Insert failed');
  }

  try {
    const imageId = (insertedRow as unknown as { id: string }).id;
    await replaceImageCategories(imageId, [category || 'Uncategorized']);
  } catch (assignErr) {
    console.warn('Place card category assignment failed', assignErr);
  }

  return { masterBytes: file.size, thumbBytes };
};

const slugifyCategory = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';

export const assignCategoriesToImage = async (imageId: string, categoryNames: string[]) => {
  const unique = Array.from(new Set(categoryNames.map((c) => c.trim()).filter(Boolean)));
  if (!unique.length) return;
  const name = unique[0];

  let categoryId: string | null = null;
  const { data: upserted, error: upsertErr } = await supabase
    .from('place_card_categories' as any)
    .upsert({ name, slug: slugifyCategory(name) }, { onConflict: 'name' })
    .select('id')
    .single();
  if (!upsertErr && (upserted as any)?.id) {
    categoryId = (upserted as any).id;
  } else {
    const { data: existing } = await supabase
      .from('place_card_categories' as any)
      .select('id')
      .eq('name', name)
      .maybeSingle();
    if ((existing as any)?.id) categoryId = (existing as any).id;
  }
  if (!categoryId) return;

  await supabase.from('place_card_image_categories' as any).delete().eq('image_id', imageId);
  await supabase
    .from('place_card_image_categories' as any)
    .insert({ image_id: imageId, category_id: categoryId });
  await supabase
    .from('place_card_gallery_images')
    .update({ category: name } as any)
    .eq('id', imageId);
};

export const replaceImageCategories = async (imageId: string, categoryNames: string[]) => {
  await supabase.from('place_card_image_categories' as any).delete().eq('image_id', imageId);
  if (categoryNames.length) {
    await assignCategoriesToImage(imageId, categoryNames);
  } else {
    await supabase
      .from('place_card_gallery_images')
      .update({ category: 'Uncategorized' } as any)
      .eq('id', imageId);
  }
};
