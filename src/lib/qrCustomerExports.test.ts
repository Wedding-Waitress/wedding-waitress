import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({addImage:vi.fn(),options:vi.fn()}));
vi.mock('jspdf',()=>({default:class {constructor(options:unknown){mock.options(options);}addImage(...args:unknown[]){mock.addImage(...args);}}}));
import {CUSTOMER_QR_SIZE_MM,createCustomerQrJPG,createCustomerQrSVG,createCustomerQrPDF,customerQrPrintHTML,printCustomerQr} from './qrCustomerExports';
const png='data:image/png;base64,ZmFrZQ==';
describe('QR preview image export parity',()=>{
 it('preserves white-backed JPG quality and original dimensions',async()=>{
  vi.stubGlobal('Image',class {width=512;height=512;onload?:()=>void;set src(_:string){this.onload?.();}});
  const ctx={fillStyle:'',fillRect:vi.fn(),drawImage:vi.fn()};vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx as any);const encode=vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/jpeg;base64,ZmFrZQ==');
  expect(await createCustomerQrJPG(png)).toBe('data:image/jpeg;base64,ZmFrZQ==');expect(ctx.fillStyle).toBe('#FFFFFF');expect(ctx.fillRect).toHaveBeenCalledWith(0,0,512,512);expect(encode).toHaveBeenCalledWith('image/jpeg',0.9);
 });
 it('preserves the SVG wrapper dimensions and embedded generated PNG, not a new QR',async()=>{
  vi.stubGlobal('Image',class {width=512;height=512;onload?:()=>void;set src(_:string){this.onload?.();}});
  const blob=await createCustomerQrSVG(png),text=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=reject;reader.readAsText(blob);});
  expect(blob.type).toBe('image/svg+xml');const doc=new DOMParser().parseFromString(text,'image/svg+xml');expect(doc.documentElement.getAttribute('width')).toBe('512');expect(doc.querySelector('image')?.getAttribute('href')).toBe(png);
 });
 it.each([createCustomerQrJPG,createCustomerQrSVG])('rejects failed image loads rather than exporting an empty QR',async make=>{
  vi.stubGlobal('Image',class {onerror?:(error:Error)=>void;set src(_:string){this.onerror?.(new Error('Asset failed'));}});await expect(make(png)).rejects.toThrow('Asset failed');await expect(make('https://untrusted.test/qr.png')).rejects.toThrow('Generated PNG required');
 });
 beforeEach(()=>{mock.addImage.mockClear();mock.options.mockClear();});afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
 it('mirrors the square intrinsic preview with no added page margins or content',async()=>{
  vi.stubGlobal('Image',class {onload?:()=>void;set src(_:string){this.onload?.();}});
  await createCustomerQrPDF(png);expect(mock.options).toHaveBeenCalledWith(expect.objectContaining({orientation:'portrait',unit:'mm',format:[CUSTOMER_QR_SIZE_MM,CUSTOMER_QR_SIZE_MM],compress:true,putOnlyUsedFonts:true,precision:2}));
  expect(mock.addImage).toHaveBeenCalledWith(expect.anything(),'PNG',0,0,CUSTOMER_QR_SIZE_MM,CUSTOMER_QR_SIZE_MM);
 });
 it('prints only the current QR at the same intrinsic size as the PDF',()=>{
  const doc=new DOMParser().parseFromString(customerQrPrintHTML(png,'Élodie & Jean-Luc O’Connor'),'text/html');
  expect(doc.querySelector('h1')).toBeNull();expect(doc.title).toBe('QR Code - Élodie & Jean-Luc O’Connor');expect(doc.querySelector('img')?.getAttribute('src')).toBe(png);
  expect(doc.querySelector('style')?.textContent).toContain(`@page { size: ${CUSTOMER_QR_SIZE_MM}mm ${CUSTOMER_QR_SIZE_MM}mm; margin: 0; }`);
  expect(doc.querySelector('style')?.textContent).toContain('body { margin: 0; padding: 0; }');
 });
 it('treats event names as text and rejects caller-supplied remote HTML image URLs',()=>{
  const doc=new DOMParser().parseFromString(customerQrPrintHTML(png,'<script>not executable</script>'),'text/html');
  expect(doc.querySelector('script')).toBeNull();expect(doc.title).toBe('QR Code - <script>not executable</script>');
  expect(()=>customerQrPrintHTML('https://untrusted.test/image.png','Event')).toThrow('Generated PNG required');
 });
 it('uses only the generated PNG in the existing print window and reports popup blocking',()=>{
  const target={document:{write:vi.fn(),close:vi.fn()},print:vi.fn()};const open=vi.spyOn(window,'open').mockReturnValue(target as any);
  printCustomerQr(png,'Saved Event');expect(target.document.write).toHaveBeenCalledWith(customerQrPrintHTML(png,'Saved Event'));expect(target.print).toHaveBeenCalledOnce();
  open.mockReturnValue(null);expect(()=>printCustomerQr(png,'Saved Event')).toThrow('blocked');
 });
});
