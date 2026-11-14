import { describe, it, expect, vi, beforeEach } from 'vitest';
const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('html2canvas', () => ({default:capture}));
vi.mock('./pdfExportUtils', () => ({PDF_DEFAULT_OPTIONS:{},savePdfAsync:vi.fn()}));
vi.mock('jspdf', () => ({default:class {addPage(){} addImage(){}}}));
import {createFullSeatingPreviewPdf,prepareFullSeatingPdfClone} from './fullSeatingPreviewPdf';
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

it('rejects changed data after capture and restores the selected page',async()=>{let changed=false;const renderPage=vi.fn(async(_page:number)=>{});capture.mockImplementation(async()=>{changed=true;return{toDataURL:()=> 'data:image/png;base64,AA=='};});await expect(createFullSeatingPreviewPdf({eventName:'Wedding',mode:'all',pageNumbers:[1,2],currentPage:2,renderPage,getPageElement:()=>document.createElement('div'),assertContext:()=>{if(changed)throw Error('Chart changed');}})).rejects.toThrow('Chart changed');expect(capture).toHaveBeenCalledTimes(1);expect(renderPage).toHaveBeenLastCalledWith(2);expect([...document.querySelectorAll('style')].some(s=>s.textContent?.includes(gif))).toBe(false);});

it('neutralizes only external horizontal scroll in the export clone',()=>{const doc=document.implementation.createHTMLDocument();doc.body.innerHTML='<div data-a4-preview-wrapper style="width:327px;overflow-x:auto"><div data-a4-preview-page style="width:210mm;height:297mm"><h3>Guests 51-75</h3></div></div>';const wrapper=doc.querySelector<HTMLElement>('[data-a4-preview-wrapper]')!,page=doc.querySelector<HTMLElement>('[data-a4-preview-page]')!;wrapper.scrollLeft=412;const contents=page.innerHTML;prepareFullSeatingPdfClone(doc);expect(wrapper.scrollLeft).toBe(0);expect(wrapper.style.width).toBe('327px');expect(page.style.width).toBe('210mm');expect(page.style.height).toBe('297mm');expect(page.innerHTML).toBe(contents);});

it.each([false,true])('restores external scroll after capture success or failure (%s)',async failure=>{const wrapper=document.createElement('div');wrapper.setAttribute('data-a4-preview-wrapper','true');wrapper.scrollLeft=412;const page=document.createElement('div');wrapper.append(page);capture.mockImplementation(async()=>{expect(wrapper.scrollLeft).toBe(0);if(failure)throw Error('capture failed');return{toDataURL:()=> 'data:image/png;base64,AA=='};});const operation=createFullSeatingPreviewPdf({eventName:'Wedding',mode:'single',pageNumbers:[1],currentPage:1,renderPage:async()=>{},getPageElement:()=>page});if(failure)await expect(operation).rejects.toThrow('capture failed');else await operation;expect(wrapper.scrollLeft).toBe(412);});
