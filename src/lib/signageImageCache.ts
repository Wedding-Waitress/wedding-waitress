interface ImageSize { width: number; height: number }
const sizes = new Map<string, ImageSize>();
const requests = new Map<string, Promise<ImageSize>>();
const MAX_CACHED_IMAGES = 128;
export function rememberSignageImage(url: string, width: number, height: number) {
  if (!width || !height) return;
  sizes.delete(url); sizes.set(url, { width, height });
  if (sizes.size > MAX_CACHED_IMAGES) sizes.delete(sizes.keys().next().value!);
}
export const hasLoadedSignageImage = (url: string) => sizes.has(url);
export function loadSignageImageSize(url: string): Promise<ImageSize> {
  const known = sizes.get(url);
  if (known) return Promise.resolve(known);
  const existing = requests.get(url);
  if (existing) return existing;
  const request = new Promise<ImageSize>((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => { image.onload = image.onerror = null; reject(new Error('Image download timed out')); }, 20_000);
    image.onload = () => {
      clearTimeout(timer);
      rememberSignageImage(url, image.naturalWidth, image.naturalHeight);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => { clearTimeout(timer); reject(new Error('Image could not be loaded')); };
    image.src = url;
    if (typeof image.decode === 'function') {
      void image.decode().then(() => image.onload?.(new Event('load') as any)).catch(() => image.onerror?.(new Event('error') as any));
    }
  }).finally(() => requests.delete(url));
  requests.set(url, request);
  return request;
}
