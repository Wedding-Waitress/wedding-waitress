import React, { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FullSeatingChartPreview, type FullSeatingChartPreviewHandle } from './FullSeatingChartPreview';
const settings:any={sortBy:'firstName',fontSize:'standard',showDietary:true,showGuestNames:true,showSeatNumbers:true,showGuestList:true,showRelation:true,guestNameColor:'#000000',seatNumberColor:'#000000',guestListColor:'#000000',dietaryColor:'#000000',relationshipColor:'#000000',showLogo:true,isBold:true};
const guests:any[]=Array.from({length:78},(_,i)=>({id:String(i),first_name:`Guest ${i+1}`,last_name:'Family',table_id:'table1',table_no:99,dietary:' N/A '}));
const event={id:'one',name:'Wedding',date:'2027-09-05'};
describe('Full Seating Chart preview, export and print state',()=>{
 it('keeps one document and exports the selected page with global guest ranges',async()=>{
  const ref=createRef<FullSeatingChartPreviewHandle>();const {container}=render(<FullSeatingChartPreview ref={ref} event={event} guests={guests} settings={settings}/>);
  expect(container.querySelectorAll('[data-a4-preview-page]')).toHaveLength(1);
  expect(container.querySelector('[data-a4-preview-page]')).toHaveAttribute('data-print-mirror-document', 'full-seating-chart');
  fireEvent.click(screen.getAllByRole('button',{name:'Next'})[0]);
  expect(ref.current!.getCurrentPage()).toBe(2);
  expect(ref.current!.getPageElement()!.textContent).toContain('Guests 51-75');
  expect(ref.current!.getPageElement()!.textContent).toContain('Total Guests: 78');
  await act(()=>ref.current!.renderPage(1));await act(()=>ref.current!.renderPage(2));
  expect(ref.current!.getPageElement()!.querySelectorAll('[data-full-seating-guest-row]')).toHaveLength(28);
 });
 it('retains keyboard check-off marks through pagination and print clones',()=>{
  const {container}=render(<FullSeatingChartPreview event={event} guests={guests} settings={settings}/>);
  fireEvent.keyDown(screen.getByRole('checkbox',{name:'Check off Guest 1 Family'}),{key:' '});
  fireEvent.click(screen.getAllByRole('button',{name:'Next'})[0]);
  act(()=>window.dispatchEvent(new Event('beforeprint')));
  const sheets=document.querySelectorAll('[data-full-seating-print-page]');expect(sheets).toHaveLength(2);
  expect(sheets[0].querySelector('[role="checkbox"]')).toHaveAttribute('aria-checked','true');
  expect(sheets[1].textContent).toContain('Guest 78 Family');
  act(()=>window.dispatchEvent(new Event('afterprint')));
  expect(container.querySelector('#full-seating-print-content')).toBeTruthy();
  expect(container.querySelectorAll('[data-full-seating-print-page]')).toHaveLength(0);
  expect(screen.getAllByText('Page 2 of 2').length).toBeGreaterThan(0);
 });
 it('clamps a removed page and resets check-offs on event change',()=>{
  const ref=createRef<FullSeatingChartPreviewHandle>();const {rerender}=render(<FullSeatingChartPreview ref={ref} event={event} guests={guests} settings={settings}/>);
  fireEvent.click(screen.getAllByRole('button',{name:'Next'})[0]);
  rerender(<FullSeatingChartPreview ref={ref} event={event} guests={guests.slice(0,1)} settings={settings}/>);
  expect(ref.current!.getCurrentPage()).toBe(1);
  fireEvent.click(screen.getByRole('checkbox',{name:'Check off Guest 1 Family'}));
  rerender(<FullSeatingChartPreview ref={ref} event={{...event,id:'two'}} guests={guests.slice(0,1)} settings={settings}/>);
  expect(screen.getByRole('checkbox',{name:'Check off Guest 1 Family'})).toHaveAttribute('aria-checked','false');
 });
 it('uses current table identity and excludes blank dietary markers',()=>{
  const {container}=render(<FullSeatingChartPreview event={event} guests={guests.slice(0,1)} settings={settings} tableIdNameMap={{table1:'Head Table'}}/>);
  expect(container.querySelector('[data-seat-assignment-text]')).toHaveTextContent('Head Table');
  expect(container.querySelector('[data-dietary-text]')).toBeNull();
 });
});
