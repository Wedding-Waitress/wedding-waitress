import {afterEach,expect,it,vi} from 'vitest';
import {savePdfBlobAsync} from './pdfExportUtils';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();document.querySelectorAll('a[download]').forEach(a=>a.remove());});
it('attaches a download link and retains the Blob URL until the browser can consume it',async()=>{
 vi.useFakeTimers();
 const create=vi.fn().mockReturnValue('blob:qr-fixture'),revoke=vi.fn();
 vi.stubGlobal('URL',Object.assign(class {},{createObjectURL:create,revokeObjectURL:revoke}));
 vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){expect(document.body.contains(this)).toBe(true);expect(this.download).toBe('qr.png');});
 const saving=savePdfBlobAsync(new Blob(['fixture'],{type:'image/png'}),'qr.png');
 await vi.advanceTimersByTimeAsync(50);await saving;
 expect(document.querySelector('a[download="qr.png"]')).toBeInTheDocument();expect(revoke).not.toHaveBeenCalled();
 await vi.advanceTimersByTimeAsync(60000);
 expect(document.querySelector('a[download="qr.png"]')).toBeNull();expect(revoke).toHaveBeenCalledWith('blob:qr-fixture');
});
