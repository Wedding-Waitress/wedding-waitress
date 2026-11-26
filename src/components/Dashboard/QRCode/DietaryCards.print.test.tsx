import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({create:vi.fn(),open:vi.fn(),print:vi.fn(),close:vi.fn(),save:vi.fn()}));
vi.mock('@/lib/dietaryCardsPdfExporter',()=>({createDietaryCardsPdf:mocks.create}));
vi.mock('@/lib/pdfPrint',()=>({openPdfPrintFrame:mocks.open}));
vi.mock('@/lib/pdfExportUtils',()=>({savePdfAsync:mocks.save}));
import { DietaryCards } from './DietaryCards';
const guests=Array.from({length:7},(_,i)=>({id:String(i),first_name:'Example',last_name:String(i),dietary:'No mushrooms',table_display:'1',seat_no:i+1}));
const blob=new Blob(['fixture'],{type:'application/pdf'});
beforeEach(()=>{
  vi.resetAllMocks(); vi.spyOn(HTMLElement.prototype,'clientHeight','get').mockReturnValue(200); vi.spyOn(HTMLElement.prototype,'offsetHeight','get').mockReturnValue(50); vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
  mocks.create.mockResolvedValue({output:vi.fn(()=>blob)});mocks.print.mockResolvedValue(undefined);mocks.open.mockReturnValue({print:mocks.print,close:mocks.close});
});afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()});
const open=()=>{render(<DietaryCards guests={guests} eventId="event" eventName="Example Wedding"/>);fireEvent.click(screen.getByRole('button',{name:'Download Dietary Cards'}));};
it('prints every sheet through the same PDF renderer without downloading',async()=>{
  open();fireEvent.click(screen.getByRole('button',{name:'Print Cards'}));
  await waitFor(()=>expect(mocks.print).toHaveBeenCalledWith(blob,expect.any(Function)));
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({totalPages:2,currentPage:0,getSheet:expect.any(Function)}));
  expect(mocks.save).not.toHaveBeenCalled();await waitFor(()=>expect(mocks.close).toHaveBeenCalledOnce());
});
it('admits only one print job while the print dialog remains open',async()=>{
  let finish!:()=>void;mocks.print.mockImplementation(()=>new Promise<void>(r=>{finish=r}));open();
  const print=screen.getByRole('button',{name:'Print Cards'});act(()=>{print.dispatchEvent(new MouseEvent('click',{bubbles:true}));print.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await waitFor(()=>expect(mocks.print).toHaveBeenCalledOnce());expect(mocks.create).toHaveBeenCalledOnce();
  expect(screen.getByRole('button',{name:'Download Cards PDF'})).toBeDisabled();expect(screen.getByRole('button',{name:'Close'})).toBeDisabled();
  await act(async()=>finish());await waitFor(()=>expect(screen.getByRole('button',{name:'Print Cards'})).toBeEnabled());
});
it('closes a failed print job and allows retry',async()=>{
  mocks.create.mockRejectedValueOnce(new Error('Card overflow'));open();fireEvent.click(screen.getByRole('button',{name:'Print Cards'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Card overflow');expect(mocks.print).not.toHaveBeenCalled();expect(mocks.close).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button',{name:'Print Cards'}));await waitFor(()=>expect(mocks.print).toHaveBeenCalledOnce());
});
it('keeps Download Cards PDF as a separate download action',async()=>{
  open();fireEvent.click(screen.getByRole('button',{name:'Download Cards PDF'}));
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce());expect(mocks.open).not.toHaveBeenCalled();expect(mocks.print).not.toHaveBeenCalled();
});
