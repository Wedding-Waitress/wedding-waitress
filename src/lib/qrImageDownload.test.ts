import {afterEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({save:vi.fn().mockResolvedValue(undefined)}));
vi.mock('@/lib/pdfExportUtils',()=>({savePdfBlobAsync:mock.save}));
import {downloadCustomerQrImage} from './qrCustomerExports';
afterEach(()=>vi.clearAllMocks());
it.each([['png','image/png'],['jpg','image/jpeg']])('delivers %s as a Blob of the correct format',async(extension,mime)=>{
 await downloadCustomerQrImage(`data:${mime};base64,ZmFrZQ==`,`qr.${extension}`);
 const [blob,name]=mock.save.mock.calls[0];expect(blob).toBeInstanceOf(Blob);expect(blob.type).toBe(mime);expect(blob.size).toBe(4);expect(name).toBe(`qr.${extension}`);
});
it('rejects remote or unexpected image sources',async()=>{
 await expect(downloadCustomerQrImage('https://example.test/image.png','qr.png')).rejects.toThrow('Generated PNG or JPG required');
 expect(mock.save).not.toHaveBeenCalled();
});
it('propagates a download failure instead of reporting success',async()=>{
 mock.save.mockRejectedValueOnce(new Error('Download failed'));
 await expect(downloadCustomerQrImage('data:image/png;base64,ZmFrZQ==','qr.png')).rejects.toThrow('Download failed');
});
