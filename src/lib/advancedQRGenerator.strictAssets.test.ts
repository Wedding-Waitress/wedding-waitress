import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {AdvancedQRGenerator} from './advancedQRGenerator';
beforeEach(()=>{vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as any);vi.stubGlobal('Image',class {onerror?:()=>void;set src(_value:string){queueMicrotask(()=>this.onerror?.());}});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('QR strict asset failure policy is opt-in',()=>{
 it.each(['applyCenterImage','drawBackgroundImage'])('strict %s rejects missing saved artwork instead of incomplete output',async method=>{const qr=new AdvancedQRGenerator(512,true,true);await expect((qr as any)[method]({center_image_url:'fixture',background_image_url:'fixture'})).rejects.toThrow(/failed to load/);});
 it.each(['applyCenterImage','drawBackgroundImage'])('default %s retains existing normal QR error behavior',async method=>{const qr=new AdvancedQRGenerator(512,true);await expect((qr as any)[method]({center_image_url:'fixture',background_image_url:'fixture'})).resolves.toBeUndefined();});
});
