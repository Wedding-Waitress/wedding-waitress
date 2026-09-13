import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {ReceptionFloorPlan} from '@/hooks/useReceptionFloorPlan';
import {AdminReadOnlyReceptionPlan} from './AdminReadOnlyReceptionPlan';
const mocks=vi.hoisted(()=>({renderer:vi.fn(),exportPdf:vi.fn()}));
vi.mock('@/hooks/useReceptionFloorPlan',()=>({receptionFloorPlanFromRow:vi.fn()}));
vi.mock('@/lib/receptionFloorPlanPdfExporter',()=>({exportReceptionPreviewToPdf:mocks.exportPdf}));
vi.mock('@/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas',()=>({
 ReceptionFloorPlanCanvas:(props:any)=>{mocks.renderer(props);return <div ref={props.a4Ref} data-testid="saved-reception-document"/>;},
}));
describe('read-only Reception document adapter',()=>{
 beforeEach(()=>{mocks.renderer.mockClear();mocks.exportPdf.mockReset().mockResolvedValue(undefined);});
 it('uses saved geometry and exports the mounted authoritative document',async()=>{
  const plan={id:'saved',background:{path:null,visible:true}} as ReceptionFloorPlan;
  const event={name:"Élodie & O’Connor",date:'2027-09-05'};
  render(<AdminReadOnlyReceptionPlan plan={plan} tables={[]} event={event} attendingCount={7}/>);
  const props=mocks.renderer.mock.lastCall![0];
  expect(props.plan).toBe(plan);expect(props.readOnly).toBe(true);expect(props.attendingCount).toBe(7);
  expect(props.onChange(()=>{throw new Error('must not mutate');})).toBeUndefined();
  fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));
  await waitFor(()=>expect(mocks.exportPdf).toHaveBeenCalledWith({pageElement:screen.getByTestId('saved-reception-document'),eventName:event.name,eventDate:event.date}));
 });
 it('does not manufacture a missing plan',()=>{
  render(<AdminReadOnlyReceptionPlan plan={null} tables={[]} event={{name:'Event'}} attendingCount={0}/>);
  expect(screen.getByText('No saved Reception Floor Plan recorded.')).toBeInTheDocument();
  expect(mocks.renderer).not.toHaveBeenCalled();
 });
 it('fails closed instead of dropping an unavailable visible private background',()=>{
  const plan={id:'saved',background:{path:'private.png',visible:true}} as ReceptionFloorPlan;
  render(<AdminReadOnlyReceptionPlan plan={plan} tables={[]} event={{name:'Event'}} attendingCount={0}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('verified read-only media access');
  expect(mocks.renderer).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Download PDF'})).not.toBeInTheDocument();
 });
});
