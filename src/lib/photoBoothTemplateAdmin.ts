import { supabase } from '@/integrations/supabase/client';
import type { PhotoBoothBackgroundTemplate } from './photoBoothBackgroundTemplates';

export const PHOTO_BOOTH_TEMPLATE_BUCKET = 'photo-booth-template-library';
export const PHOTO_BOOTH_TEMPLATE_WIDTH = 1200;
export const PHOTO_BOOTH_TEMPLATE_HEIGHT = 1800;
export const PHOTO_BOOTH_TEMPLATE_THUMB_WIDTH = 288;
export const PHOTO_BOOTH_TEMPLATE_THUMB_HEIGHT = 432;
export const PHOTO_BOOTH_TEMPLATE_MAX_FILES = 96;

const naturalCollator = new Intl.Collator('en-AU', { numeric: true, sensitivity: 'base' });

const colourMatchers: ReadonlyArray<readonly [string, RegExp]> = [
  ['Rose Gold', /\brose[\s_-]*gold\b/i],
  ['Black and White', /\bblack[\s_-]*(?:and|&)[\s_-]*white\b|\bblack[\s_-]*white\b/i],
  ['Multicolour', /\bmulti[\s_-]*colou?r\b|\brainbow\b/i],
  ['Champagne', /\bchampagne\b/i], ['Burgundy', /\bburgundy\b|\bmaroon\b|\bwine\b/i],
  ['Cream', /\bcream\b/i], ['Ivory', /\bivory\b/i], ['Silver', /\bsilver\b/i],
  ['Grey', /\bgr[ae]y\b/i], ['Purple', /\bpurple\b|\blavender\b|\blilac\b|\bplum\b/i],
  ['Orange', /\borange\b|\bterracotta\b/i], ['Pink', /\bpink\b|\bblush\b/i],
  ['Green', /\bgreen\b|\bsage\b|\bemerald\b/i], ['Blue', /\bblue\b|\bnavy\b|\bteal blue\b/i],
  ['Teal', /\bteal\b|\bturquoise\b/i], ['Brown', /\bbrown\b|\bespresso\b|\bchocolate\b/i],
  ['Gold', /\bgold\b|\bgolden\b/i], ['Black', /\bblack\b|\bcharcoal\b/i],
  ['White', /\bwhite\b/i], ['Red', /\bred\b|\bscarlet\b|\bcrimson\b/i], ['Yellow', /\byellow\b/i],
];

export const photoBoothTemplateName = (filename: string) =>
  filename.replace(/\.[^.]+$/, '').trim();

export const detectPhotoBoothTemplateColour = (filename: string) => {
  const name = filename.normalize('NFKD').replace(/[\u0300-\u036f]/g, ' ');
  return colourMatchers.find(([, matcher]) => matcher.test(name))?.[0] ?? 'Multicolour';
};

export const naturalPhotoBoothTemplateCompare = (a: Pick<PhotoBoothBackgroundTemplate, 'name'>, b: Pick<PhotoBoothBackgroundTemplate, 'name'>) =>
  naturalCollator.compare(a.name, b.name);

export const isAcceptedPhotoBoothTemplateFile = (file: Pick<File, 'name' | 'type'>) =>
  (/\.jpe?g$/i.test(file.name) && /^image\/jpeg$/i.test(file.type))
  || (/\.png$/i.test(file.name) && /^image\/png$/i.test(file.type));

export const assertPhotoBoothTemplateDimensions = (width: number, height: number) => {
  if (width !== PHOTO_BOOTH_TEMPLATE_WIDTH || height !== PHOTO_BOOTH_TEMPLATE_HEIGHT) {
    throw new Error(`${width} x ${height}; expected exactly 1200 x 1800 px.`);
  }
};

export const readPhotoBoothTemplateImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The image could not be read.')); };
  image.src = url;
});

export const validatePhotoBoothTemplateFile = async (file: File) => {
  if (!isAcceptedPhotoBoothTemplateFile(file)) {
    throw new Error('Please upload a JPG, JPEG or PNG image.');
  }
  const image = await readPhotoBoothTemplateImage(file);
  assertPhotoBoothTemplateDimensions(image.naturalWidth, image.naturalHeight);
  return image;
};

const thumbnailBlob = async (image: HTMLImageElement) => {
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_BOOTH_TEMPLATE_THUMB_WIDTH;
  canvas.height = PHOTO_BOOTH_TEMPLATE_THUMB_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the template thumbnail.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('Could not create the template thumbnail.')),
    'image/jpeg',
    0.82,
  ));
};

const safeStem = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'template';

export const uploadPhotoBoothTemplate = async (file: File, category = 'General') => {
  const image = await validatePhotoBoothTemplateFile(file);
  const thumb = await thumbnailBlob(image);
  const name = photoBoothTemplateName(file.name);
  const colour = detectPhotoBoothTemplateColour(name);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const extension = file.type === 'image/png' ? 'png' : 'jpg';
  const originalPath = `originals/${safeStem(name)}-${suffix}.${extension}`;
  const thumbnailPath = `thumbnails/${safeStem(name)}-${suffix}.jpg`;
  const uploaded: string[] = [];
  try {
    const originalResult = await supabase.storage.from(PHOTO_BOOTH_TEMPLATE_BUCKET).upload(originalPath, file, { contentType: file.type, upsert: false });
    if (originalResult.error) throw originalResult.error;
    uploaded.push(originalPath);
    const thumbResult = await supabase.storage.from(PHOTO_BOOTH_TEMPLATE_BUCKET).upload(thumbnailPath, thumb, { contentType: 'image/jpeg', upsert: false });
    if (thumbResult.error) throw thumbResult.error;
    uploaded.push(thumbnailPath);
    const imageUrl = supabase.storage.from(PHOTO_BOOTH_TEMPLATE_BUCKET).getPublicUrl(originalPath).data.publicUrl;
    const thumbUrl = supabase.storage.from(PHOTO_BOOTH_TEMPLATE_BUCKET).getPublicUrl(thumbnailPath).data.publicUrl;
    const { data, error } = await (supabase as any).from('photo_booth_background_templates').insert({
      name, category: category.trim() || 'General', colour, image_url: imageUrl,
      thumbnail_url: thumbUrl, original_path: originalPath, thumbnail_path: thumbnailPath,
    }).select('*').single();
    if (error) throw error;
    return data as Record<string, unknown>;
  } catch (error) {
    if (uploaded.length) await supabase.storage.from(PHOTO_BOOTH_TEMPLATE_BUCKET).remove(uploaded);
    throw error;
  }
};
