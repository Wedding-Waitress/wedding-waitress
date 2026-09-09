import { describe, it, expect, vi, beforeEach } from 'vitest';
const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('html2canvas', () => ({default:capture}));
vi.mock('./pdfExportUtils', () => ({PDF_DEFAULT_OPTIONS:{},savePdfAsync:vi.fn()}));
vi.mock('jspdf', () => ({default:class {addPage(){} addImage(){}}}));
import {createFullSeatingPreviewPdf} from './fullSeatingPreviewPdf';
const gif='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
beforeEach(()=>{
 vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{fn(0);return 1;});
 Object.defineProperty(document,'fonts',{configurable:true,value:{ready:Promise.resolve()}});
 capture.mockReset();
});
describe('Full Seating Chart font baseline regression',()=>{
 it('isolates the html2canvas probe from block image styles without changing chart contents',async()=>{
  const css=document.createElement('style');css.textContent='img { display:block; }';document.head.append(css);
  const page=document.createElement('div');page.innerHTML='<h1>Wedding</h1><span>Amelia Reed</span><img src="logo.png">';
  const content=page.innerHTML;const renders=vi.fn(async(_page:number)=>{});
  page.querySelector('img')!.decode=async()=>{};
  capture.mockImplementation(async()=>{
   const container=document.createElement('div');const probe=document.createElement('img');probe.src=gif;probe.width=1;probe.height=1;container.append(probe);document.body.append(container);
   expect(getComputedStyle(probe).display).toBe('inline');
   expect(getComputedStyle(page.querySelector('img')!).display).toBe('block');
   expect(page.innerHTML).toBe(content);container.remove();
   return {toDataURL:()=> 'data:image/png;base64,AA=='};
  });
  await createFullSeatingPreviewPdf({eventName:'Wedding',mode:'all',pageNumbers:[1,2],currentPage:2,renderPage:renders,getPageElement:()=>page});
  expect(capture).toHaveBeenCalledTimes(2);expect(renders.mock.calls.map(c=>c[0])).toEqual([1,2,2]);
  expect([...document.querySelectorAll('style')].some(s=>s.textContent?.includes(gif))).toBe(false);css.remove();
 });
 it('removes the temporary metrics fix and restores the page when capture fails',async()=>{
  capture.mockRejectedValue(new Error('capture failed'));const renders=vi.fn(async(_page:number)=>{});
  await expect(createFullSeatingPreviewPdf({eventName:'Wedding',mode:'single',pageNumbers:[2],currentPage:2,renderPage:renders,getPageElement:()=>document.createElement('div')})).rejects.toThrow('capture failed');
  expect(renders).toHaveBeenLastCalledWith(2);
  expect([...document.querySelectorAll('style')].some(s=>s.textContent?.includes(gif))).toBe(false);
 });
});
