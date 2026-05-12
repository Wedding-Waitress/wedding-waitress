import { supabase } from '@/integrations/supabase/client';

export const MAX_INVITATION_UPLOAD_BYTES = 50 * 1024 * 1024;

export interface InvitationUploadResult {
  masterBytes: number;
  thumbBytes: number;
}

export const prettifyInvitationFilename = (filename: string) => {
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
    .slice(0, 80) || `invitation-${Date.now()}`;

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
    console.warn('Invitation thumbnail generation skipped', error);
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const uploadInvitationGalleryImage = async (
  file: File,
  name: string,
  category: string,
): Promise<InvitationUploadResult> => {
  if (file.size > MAX_INVITATION_UPLOAD_BYTES) {
    throw new Error(`File is larger than 50 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`);
  }

  const slug = slugify(name);
  const stamp = Date.now();
  const token = randomToken();
  const masterPath = `originals/${slug}-${stamp}-${token}.${extensionForFile(file)}`;
  const thumbPath = `thumbs/${slug}-${stamp}-${token}.jpg`;
  const uploadedPaths: string[] = [];

  const masterUpload = await supabase.storage.from('invitation-gallery').upload(masterPath, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (masterUpload.error) throw masterUpload.error;
  uploadedPaths.push(masterPath);

  const masterUrl = supabase.storage.from('invitation-gallery').getPublicUrl(masterPath).data.publicUrl;
  let thumbUrl: string | null = null;
  let thumbBytes = 0;

  const thumbnailBlob = await createThumbnailBlob(file);
  if (thumbnailBlob) {
    const thumbUpload = await supabase.storage.from('invitation-gallery').upload(thumbPath, thumbnailBlob, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (thumbUpload.error) {
      console.warn('Invitation thumbnail upload skipped', thumbUpload.error);
    } else {
      uploadedPaths.push(thumbPath);
      thumbUrl = supabase.storage.from('invitation-gallery').getPublicUrl(thumbPath).data.publicUrl;
      thumbBytes = thumbnailBlob.size;
    }
  }

  const { data: maxRow } = await supabase
    .from('invitation_gallery_images' as any)
    .select('sort_order')
    .eq('category', category)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (((maxRow as any)?.sort_order ?? -1) as number) + 1;
  const { error: insertError } = await supabase.from('invitation_gallery_images' as any).insert({
    name,
    category,
    image_url: masterUrl,
    thumbnail_url: thumbUrl,
    sort_order: sortOrder,
  });

  if (insertError) {
    if (uploadedPaths.length) await supabase.storage.from('invitation-gallery').remove(uploadedPaths);
    throw insertError;
  }

  return {
    masterBytes: file.size,
    thumbBytes,
  };
};
