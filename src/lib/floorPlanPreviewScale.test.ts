import {expect,it} from 'vitest';
import {floorPlanPreviewWidthScale} from './floorPlanPreviewScale';
it('fills the desktop workspace proportionally while preserving shared/admin and narrow-screen presentation',()=>{
 const scale=floorPlanPreviewWidthScale(1598,1123,true,1920);
 expect(scale).toBeCloseTo(1.42297,4);expect(1123*scale).toBeCloseTo(1598);expect((794*scale)/(1123*scale)).toBeCloseTo(794/1123);
 expect(floorPlanPreviewWidthScale(1598,1123,false,1920)).toBe(1);
 expect(floorPlanPreviewWidthScale(1200,1123,true,1024)).toBe(1);
 expect(floorPlanPreviewWidthScale(350,1123,true,390)).toBeCloseTo(350/1123);
});
