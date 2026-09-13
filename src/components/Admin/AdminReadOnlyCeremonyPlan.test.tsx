import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {CeremonyFloorPlan} from '@/hooks/useCeremonyFloorPlan';
import {AdminReadOnlyCeremonyPlan} from './AdminReadOnlyCeremonyPlan';
const mocks=vi.hoisted(()=>({renderer:vi.fn(),exportPdf:vi.fn()}));
vi.mock('@/lib/ceremonyFloorPlanPdfExporter',()=>({exportCeremonyPreviewToPdf:mocks.exportPdf}));
vi.mock('@/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanA4',()=>({
 CeremonyFloorPlanA4:React.forwardRef<HTMLDivElement,unknown>((props,ref)=>{
  mocks.renderer(props);return <div ref={ref} data-testid="authoritative-document"/>;
 }),
}));
describe('read-only Ceremony document adapter',()=>{
 beforeEach(()=>{mocks.renderer.mockClear();mocks.exportPdf.mockReset().mockResolvedValue(undefined);});
 it('exports the visible renderer and never supplies customer edit callbacks',async()=>{
  const plan={id:'saved-plan'} as CeremonyFloorPlan;
  const event={name:'Élodie & James',date:'2027-09-05',venue:null};
  render(<AdminReadOnlyCeremonyPlan plan={plan} event={event}/>);
  const props=mocks.renderer.mock.lastCall![0];
  expect(props.floorPlan).toBe(plan);expect(props.event).toBe(event);
  for(const callback of ['onSeatUpdate','onBridalPartyUpdate','onBridalPartyRoleUpdate'])expect(props[callback]).toBeUndefined();
  expect(mocks.exportPdf).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));
  await waitFor(()=>expect(mocks.exportPdf).toHaveBeenCalledWith({pageElement:screen.getByTestId('authoritative-document'),eventName:event.name,eventDate:event.date}));
 });
 it('does not invent a plan when none is saved',()=>{
  render(<AdminReadOnlyCeremonyPlan plan={null} event={{name:'Saved event',date:null,venue:null}}/>);
  expect(screen.getByText('No saved Ceremony Floor Plan recorded.')).toBeInTheDocument();
  expect(mocks.renderer).not.toHaveBeenCalled();expect(mocks.exportPdf).not.toHaveBeenCalled();
 });
});
