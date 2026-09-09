import { A4_MM, CSS_DPI, MM_PER_INCH } from './a4';

export const INDIVIDUAL_CHART_EXPORT_DPI = 600;

/** Preserve browser text metrics instead of redrawing text with html2canvas. */
export async function captureIndividualTableChart(element: HTMLElement): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const clone = element.cloneNode(true) as HTMLElement;
  const originals = [element, ...Array.from(element.querySelectorAll('*'))];
  const copies = [clone, ...Array.from(clone.querySelectorAll('*'))];
  originals.forEach((source, index) => {
    const target = copies[index] as HTMLElement;
    const computed = getComputedStyle(source);
    for (const property of Array.from(computed)) {
      target.style.setProperty(property, computed.getPropertyValue(property));
    }
  });
  // Only the external paper presentation is neutralised. Internal layout is unchanged.
  clone.style.margin = '0';
  clone.style.transform = 'none';
  clone.style.boxShadow = 'none';
  await Promise.all(Array.from(clone.querySelectorAll('img')).map(async image => {
    const response = await fetch(image.src);
    if (!response.ok) throw new Error('Unable to load the chart logo');
    const blob = await response.blob();
    image.src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Unable to embed the chart logo'));
      reader.readAsDataURL(blob);
    });
    image.removeAttribute('srcset');
  }));
  const width = A4_MM.width / MM_PER_INCH * CSS_DPI;
  const height = A4_MM.height / MM_PER_INCH * CSS_DPI;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  const content = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  content.setAttribute('width', '100%');
  content.setAttribute('height', '100%');
  content.appendChild(clone);
  svg.appendChild(content);
  const image = new Image();
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(A4_MM.width / MM_PER_INCH * INDIVIDUAL_CHART_EXPORT_DPI);
  canvas.height = Math.round(A4_MM.height / MM_PER_INCH * INDIVIDUAL_CHART_EXPORT_DPI);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create the chart image');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}
