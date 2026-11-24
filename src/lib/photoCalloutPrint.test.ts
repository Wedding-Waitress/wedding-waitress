import {afterEach,expect,it,vi} from 'vitest';
vi.mock('./photoCalloutReady',()=>({waitForPhotoCardLayout:vi.fn(async()=>{})}));
vi.mock('./photoCalloutPrintFrame',()=>({createPhotoCalloutPrintFrame:vi.fn(async(root:HTMLElement)=>{
 const surface=document.createElement('div');surface.dataset.photoPrintPreview='';const clone=root.cloneNode(true) as HTMLElement;clone.dataset.photoPrintSource='true';surface.append(clone);document.body.append(surface);
 return {printWindow:window,close:()=>surface.remove()};
})}));
import {printPhotoCalloutDocument} from './photoCalloutPrint';
afterEach(()=>vi.restoreAllMocks());
it('prints all mounted pages directly, with no popup, then restores preview state',async()=>{
 const root=document.createElement('div');root.innerHTML='<section data-photo-sheet></section>';
 const start=vi.fn(()=>root.append(document.createElement('section'))),end=vi.fn();
 root.addEventListener('photo-export-start',start);root.addEventListener('photo-export-end',end);
 const popup=vi.spyOn(window,'open');const print=vi.spyOn(window,'print').mockImplementation(()=>{expect(document.querySelector('[data-photo-print-preview] [data-photo-print-source]')?.children).toHaveLength(2);expect(root.children).toHaveLength(2);window.dispatchEvent(new Event('afterprint'));});
 await printPhotoCalloutDocument(root);expect(print).toHaveBeenCalledOnce();expect(popup).not.toHaveBeenCalled();expect(end).toHaveBeenCalledOnce();expect(root.hasAttribute('data-photo-print-source')).toBe(false);
});
it('keeps pages isolated after print returns until the print dialog closes',async()=>{
 const host=document.createElement('main'),root=document.createElement('div'),sidebar=document.createElement('aside');
 root.innerHTML='<section data-photo-sheet></section>';host.append(sidebar,root);document.body.append(host);
 const end=vi.fn();root.addEventListener('photo-export-end',end);vi.spyOn(window,'print').mockImplementation(()=>{});
 const pending=printPhotoCalloutDocument(root);await vi.waitFor(()=>expect(document.querySelector('[data-photo-print-preview] [data-photo-print-source]')).not.toBeNull());
 expect(root.hasAttribute('data-photo-print-source')).toBe(false);expect(end).not.toHaveBeenCalled();
 window.dispatchEvent(new Event('afterprint'));await pending;
 expect(document.querySelector('[data-photo-print-preview]')).toBeNull();expect(end).toHaveBeenCalledOnce();host.remove();
});
it('restores the preview without printing a changed event',async()=>{
 const root=document.createElement('div'),end=vi.fn();root.addEventListener('photo-export-end',end);const print=vi.spyOn(window,'print');
 await expect(printPhotoCalloutDocument(root,()=>false)).rejects.toThrow('selected event or cards changed');expect(print).not.toHaveBeenCalled();expect(end).toHaveBeenCalledOnce();
});
