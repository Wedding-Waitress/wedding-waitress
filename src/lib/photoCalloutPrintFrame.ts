import documentCss from '@/components/Dashboard/PhotoCallout/PhotoCalloutDocument.module.css?inline';
import manropeUrl from '@fontsource/manrope/files/manrope-latin-700-normal.woff2?url';

const assets = new Map<string, Promise<string>>();
function embeddedAsset(url: string): Promise<string> {
  if (url.startsWith('data:')) return Promise.resolve(url);
  const cached = assets.get(url);
  if (cached) return cached;
  const pending = fetch(url).then(async response => {
    if (!response.ok) throw new Error('Unable to prepare a photo-card print asset.');
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Unable to prepare a photo-card print asset.'));
      reader.readAsDataURL(blob);
    });
  }).catch(error => { assets.delete(url); throw error; });
  assets.set(url, pending);
  return pending;
}

/** A fully loaded, self-contained print document: no dashboard, application
 * scripts, stylesheet network requests, or pending media requests. */
export async function createPhotoCalloutPrintFrame(root: HTMLElement) {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.dataset.photoPrintSource = 'true';
  const [playfair, manrope] = await Promise.all([
    embeddedAsset('/fonts/playfair-display/playfair-display-semibold.ttf'),
    embeddedAsset(manropeUrl),
    ...Array.from(clone.querySelectorAll('img'), async image => {
      image.src = await embeddedAsset(image.src);
      image.removeAttribute('srcset');
      image.loading = 'eager';
    }),
  ]);
  const frame = document.createElement('iframe');
  frame.title = 'Group Photo List print document';
  frame.dataset.photoPrintFrame = '';
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none';
  document.body.append(frame);
  try {
    const doc = frame.contentDocument!;
    doc.open();
    doc.write('<!doctype html><html><head><title>Group Photo List</title></head><body></body></html>');
    doc.close();
    const style = doc.createElement('style');
    style.textContent = `
      @font-face{font-family:'Wedding Waitress Playfair';font-style:normal;font-weight:600;src:url('${playfair}') format('truetype')}
      @font-face{font-family:Manrope;font-style:normal;font-weight:700;src:url('${manrope}') format('woff2')}
      html,body{margin:0;padding:0;background:#fff}
      ${documentCss}
    `;
    doc.head.append(style);
    const surface = doc.createElement('div');
    surface.dataset.photoPrintPreview = '';
    surface.append(clone);
    doc.body.append(surface);
    await Promise.all([
      doc.fonts.load('600 24px "Wedding Waitress Playfair"'),
      doc.fonts.load('700 18px Manrope'),
      ...Array.from(doc.images, image => image.decode()),
    ]);
    await doc.fonts.ready;
    return { printWindow: frame.contentWindow!, close: () => frame.remove() };
  } catch (error) {
    frame.remove();
    throw error;
  }
}
