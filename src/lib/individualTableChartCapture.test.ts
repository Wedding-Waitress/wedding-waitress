import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('./documentEventTitle',()=>({embedDocumentEventTitleFont:vi.fn(async()=>{})}));
import {captureIndividualTableChart,INDIVIDUAL_CHART_EXPORT_DPI} from './individualTableChartCapture';
const context={fillStyle:'',fillRect:vi.fn(),drawImage:vi.fn()};
beforeEach(()=>{Object.defineProperty(document,'fonts',{configurable:true,value:{ready:Promise.resolve()}});vi.stubGlobal('Image',class{src='';decode=async()=>{}});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as any)});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()});
it('preserves full 600-DPI A4 detail while dropping the redundant transparent PDF mask',async()=>{const page=document.createElement('div');page.style.width='210mm';page.style.height='297mm';document.body.append(page);try{const canvas=await captureIndividualTableChart(page);expect(INDIVIDUAL_CHART_EXPORT_DPI).toBe(600);expect(canvas.width).toBe(4961);expect(canvas.height).toBe(7016);expect(canvas.getContext).toHaveBeenCalledWith('2d',{alpha:false});expect(context.fillStyle).toBe('#fff');expect(context.fillRect).toHaveBeenCalledWith(0,0,4961,7016);expect(context.drawImage).toHaveBeenCalledWith(expect.anything(),0,0,4961,7016)}finally{page.remove()}});
