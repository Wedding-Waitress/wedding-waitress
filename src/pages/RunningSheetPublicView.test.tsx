import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RunningSheetPublicView } from './RunningSheetPublicView';

const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const removeChannel = vi.fn();
  const subscribe = vi.fn(() => ({}));
  const on = vi.fn(() => ({ on, subscribe }));
  const channel = vi.fn(() => ({ on, subscribe }));
  return { rpc, removeChannel, subscribe, on, channel };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ eventSlug: 'andy-and-cathy', token: 'public_token' }) };
});
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mocks.rpc, channel: mocks.channel, removeChannel: mocks.removeChannel },
}));
vi.mock('@/lib/runningSheetPdfExporter', () => ({ exportRunningSheetPDF: vi.fn() }));
vi.mock('@/components/Dashboard/RunningSheet/RunningSheetSection', () => ({
  RunningSheetSection: ({ disabled, onResetToDefault, onRestoreItems }: any) => (
    <section data-testid="public-run-sheet" data-disabled={String(!!disabled)}>Shared rows<button disabled={disabled} onClick={()=>onRestoreItems([{id:"deleted",sheet_id:"sheet-1",order_index:0,time_text:"5 PM",description_rich:{text:"Opening",bullets:["Keep"]},responsible:"MC",is_section_header:true,is_bold:true,is_italic:true,is_underline:true}])}>Test undo</button><button disabled={disabled} onClick={onResetToDefault}>Test reset</button></section>
  ),
}));

const validRow = (permission: 'view_only' | 'can_edit') => ({
  sheet_id: 'sheet-1', event_id: 'event-1', event_name: 'Andy & Cathy',
  event_date: '2027-01-30', event_venue: 'Luxor Receptions', start_time: '18:00:00', finish_time: '23:00:00',
  ceremony_date: null, ceremony_venue: null, ceremony_start_time: null, ceremony_finish_time: null,
  permission, items: [], section_label: 'Run Sheet', section_notes: null,
});

describe('RunningSheetPublicView token retrieval', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['view_only', 'true'],
    ['can_edit', 'false'],
  ] as const)('retrieves an active %s token anonymously and enforces its permission', async (permission, disabled) => {
    mocks.rpc.mockResolvedValue({ data: [validRow(permission)], error: null });
    render(<RunningSheetPublicView />);

    await waitFor(() => expect(screen.getAllByText('Andy & Cathy')).toHaveLength(1));
    expect(mocks.rpc).toHaveBeenCalledWith('get_running_sheet_by_token', { share_token: 'public_token' });
    expect(screen.getByTestId('public-run-sheet')).toHaveAttribute('data-disabled', disabled);
    expect(screen.getByText(permission === 'can_edit' ? 'Can Edit' : 'View Only')).toBeVisible();
  });

  it.each(['expired', 'revoked', 'malformed'])('keeps an unavailable state for a %s token', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    render(<RunningSheetPublicView />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Link Unavailable' })).toBeVisible());
    expect(screen.getByText('This link is invalid or has expired')).toBeVisible();
    expect(screen.queryByTestId('public-run-sheet')).not.toBeInTheDocument();
  });
});


describe('shared reset restoration', () => {
  beforeEach(() => vi.clearAllMocks());
  it('saves all replacement defaults before removing original rows', async () => {
    let added=0;
    mocks.rpc.mockImplementation(async (name:string) => {
      if(name==='get_running_sheet_by_token') return {data:[{...validRow('can_edit'),items:[{id:'original',order_index:0}]}],error:null};
      if(name==='add_running_sheet_item_by_token') return {data:{id:'new-'+(++added)},error:null};
      return {data:true,error:null};
    });
    render(<RunningSheetPublicView />);
    await waitFor(()=>expect(screen.getByRole('button',{name:'Test reset'})).toBeEnabled());
    fireEvent.click(screen.getByRole('button',{name:'Test reset'}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('update_running_sheet_meta_by_token',expect.objectContaining({new_section_label:'Run Sheet',new_section_notes:''})));
    const calls=mocks.rpc.mock.calls;
    const removal=calls.findIndex(([name,args])=>name==='delete_running_sheet_item_by_token'&&args.item_id==='original');
    expect(calls.slice(0,removal).filter(([name])=>name==='update_running_sheet_item_by_token')).toHaveLength(13);
    expect(calls.filter(([name])=>name==='add_running_sheet_item_by_token')).toHaveLength(13);
    await waitFor(()=>expect(screen.getByRole('button',{name:'Test reset'})).toBeEnabled());
  });
  it('keeps original rows if a replacement cannot be saved',async()=>{
    mocks.rpc.mockImplementation(async(name:string)=>{
      if(name==='get_running_sheet_by_token')return{data:[{...validRow('can_edit'),items:[{id:'original',order_index:0}]}],error:null};
      if(name==='add_running_sheet_item_by_token')return{data:{id:'temporary'},error:null};
      if(name==='update_running_sheet_item_by_token')return{data:false,error:null};
      return{data:true,error:null};
    });
    render(<RunningSheetPublicView />);
    await waitFor(()=>expect(screen.getByRole('button',{name:'Test reset'})).toBeEnabled());
    fireEvent.click(screen.getByRole('button',{name:'Test reset'}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('delete_running_sheet_item_by_token',{share_token:'public_token',item_id:'temporary'}));
    expect(mocks.rpc).not.toHaveBeenCalledWith('delete_running_sheet_item_by_token',expect.objectContaining({item_id:'original'}));
  });
});

describe('shared Undo persistence',()=>{
 beforeEach(()=>vi.clearAllMocks());
 it('recreates deleted rows through token APIs and retries without duplicate rows',async()=>{
  let created=false,fail=true;
  mocks.rpc.mockImplementation(async(name:string)=>{
   if(name==='get_running_sheet_by_token')return{data:[{...validRow('can_edit'),items:created?[{id:'restored',order_index:0}]:[]}],error:null};
   if(name==='add_running_sheet_item_by_token'){created=true;return{data:{id:'restored'},error:null};}
   if(name==='update_running_sheet_item_by_token'&&fail)return{data:false,error:null};
   return{data:true,error:null};
  });
  render(<RunningSheetPublicView/>);await screen.findByRole('button',{name:'Test undo'});
  fireEvent.click(screen.getByRole('button',{name:'Test undo'}));
  await waitFor(()=>expect(mocks.rpc.mock.calls.filter(([name])=>name==='get_running_sheet_by_token').length).toBeGreaterThanOrEqual(3));
  fail=false;fireEvent.click(screen.getByRole('button',{name:'Test undo'}));
  await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('reorder_running_sheet_items_by_token',{share_token:'public_token',item_ids:['restored']}));
  expect(mocks.rpc.mock.calls.filter(([name])=>name==='add_running_sheet_item_by_token')).toHaveLength(1);
  expect(mocks.rpc).toHaveBeenCalledWith('update_running_sheet_item_by_token',expect.objectContaining({item_id:'restored',new_description_rich:{text:'Opening',bullets:['Keep']},new_is_bold:true,new_is_italic:true,new_is_underline:true,new_is_section_header:true}));
 });
});
