import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), toast: vi.fn(), clear: [] as Array<() => void> }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: m.toast }) }));
vi.mock('@/lib/cacheRegistry', () => ({ registerCache: (f: () => void) => m.clear.push(f), registerEventCache: vi.fn() }));
vi.mock('@/lib/localWeddingFonts', () => ({ resolveWeddingFontZones: (zones: unknown) => zones }));
vi.mock('@/lib/imagePipeline', () => ({ previewUrlFor: (url: string) => url }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
  from: () => ({
    select: () => ({ eq: (key: string, value: string) => ({ maybeSingle: () => m.read(value) }) }),
    update: (updates: unknown) => ({ eq: (_: string, id: string) => ({ eq: (_: string, event: string) => ({ select: () => ({ single: () => m.save(updates, id, event) }) }) }) }),
  }),
} }));
import { useSignageSettings } from './useSignageSettings';
const row = (event: string) => ({ id: `row-${event}`, event_id: event, user_id: 'owner', background_color: '#ffffff', text_zones: [], notes: '', qr_config: {} });
beforeEach(() => {
  m.clear.forEach(f => f()); vi.clearAllMocks();
  m.read.mockImplementation(async event => ({ data: row(event), error: null }));
  m.save.mockResolvedValue({ data: { id: 'saved' }, error: null });
});
afterEach(() => { vi.useRealTimers(); });
async function loaded() {
  const hook = renderHook(({ event }) => useSignageSettings(event), { initialProps: { event: 'one' } });
  await waitFor(() => expect(hook.result.current.settings?.id).toBe('row-one'));
  vi.useFakeTimers(); return hook;
}
it('saves both different fields edited within one debounce period', async () => {
  const { result } = await loaded(); let first!: Promise<boolean>, second!: Promise<boolean>;
  act(() => { first = result.current.updateSettings({ notes: 'print notes' }); second = result.current.updateSettings({ background_color: '#abcdef' }); });
  expect(result.current.settings).toMatchObject({ notes: 'print notes', background_color: '#abcdef' });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(await first).toBe(true); expect(await second).toBe(true);
  expect(m.save).toHaveBeenCalledWith({ notes: 'print notes', background_color: '#abcdef' }, 'row-one', 'one');
});
it('flushes pending edits when the editor is unmounted', async () => {
  const { result, unmount } = await loaded();
  act(() => { void result.current.updateSettings({ notes: 'keep this' }); }); unmount();
  await act(async () => { await Promise.resolve(); });
  expect(m.save).toHaveBeenCalledWith({ notes: 'keep this' }, 'row-one', 'one');
});
it('reports rejection and retries the failed fields with the next change', async () => {
  const { result } = await loaded(); m.save.mockResolvedValueOnce({ error: new Error('rejected') });
  let saved!: Promise<boolean>; act(() => { saved = result.current.updateSettings({ notes: 'retain' }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); }); expect(await saved).toBe(false);
  expect(m.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  act(() => { void result.current.updateSettings({ background_color: '#123456' }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(m.save).toHaveBeenLastCalledWith({ notes: 'retain', background_color: '#123456' }, 'row-one', 'one');
});
it('finishes an earlier write before sending the next one', async () => {
  const { result } = await loaded(); let release!: (r: unknown) => void;
  m.save.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  act(() => { void result.current.updateSettings({ notes: 'first' }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  act(() => { void result.current.updateSettings({ notes: 'second' }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); }); expect(m.save).toHaveBeenCalledTimes(1);
  await act(async () => { release({ error: null }); await Promise.resolve(); });
  expect(m.save).toHaveBeenLastCalledWith({ notes: 'second' }, 'row-one', 'one');
});

it('restores deletion with exact text-zone styling and persists undo and redo as normal sign saves', async () => {
 const zone={id:'seat',type:'custom',label:'Seat',text:'YOUR SEAT',font_family:'Lora',font_size:46,font_color:'#26354a',font_weight:'bold',x_percent:42,y_percent:38,width_percent:76,rotation:12};
 m.read.mockImplementation(async event=>({data:{...row(event),text_zones:[zone]},error:null}));
 const {result}=await loaded();expect(result.current.canUndo).toBe(false);
 act(()=>{void result.current.updateSettings({text_zones:[]});});expect(result.current.canUndo).toBe(true);
 act(()=>{void result.current.undo();});expect(result.current.settings?.text_zones).toEqual([zone]);expect(result.current.asInvitationSettings?.text_zones).toEqual([zone]);expect(result.current.canRedo).toBe(true);
 await act(async()=>{await vi.advanceTimersByTimeAsync(300);});expect(m.save).toHaveBeenLastCalledWith(expect.objectContaining({text_zones:[zone]}),'row-one','one');
 act(()=>{void result.current.redo();});expect(result.current.settings?.text_zones).toEqual([]);
 await act(async()=>{await vi.advanceTimersByTimeAsync(300);});expect(m.save).toHaveBeenLastCalledWith(expect.objectContaining({text_zones:[]}),'row-one','one');
});
it('isolates history by event/design and does not record initialization or carry a design across events', async()=>{
 const rows=new Map<string,any>();m.read.mockImplementation(async event=>({data:rows.get(event)||row(event),error:null}));m.save.mockImplementation(async(updates,id,event)=>{rows.set(event,{...(rows.get(event)||row(event)),...updates});return{data:{id},error:null};});
 const {result,rerender}=await loaded();act(()=>{void result.current.updateSettings({notes:'Event one edit'});});
 await act(async()=>{await vi.advanceTimersByTimeAsync(300);});vi.useRealTimers();
 rerender({event:'two'});await waitFor(()=>expect(result.current.settings?.event_id).toBe('two'));expect(result.current.canUndo).toBe(false);expect(result.current.settings?.notes).toBe('');
 await act(async()=>{await result.current.undo();});expect(result.current.settings?.event_id).toBe('two');
 rerender({event:'one'});await waitFor(()=>expect(result.current.settings?.event_id).toBe('one'));expect(result.current.settings?.notes).toBe('Event one edit');expect(result.current.canUndo).toBe(true);
 act(()=>{void result.current.undo();});expect(result.current.settings?.notes).toBe('');expect(result.current.settings?.event_id).toBe('one');
});
it('groups successive typing, keeps separate preview gestures, and clears redo after a new edit', async()=>{
 const zone={id:'seat',type:'custom',text:'Original',x_percent:50,y_percent:50};m.read.mockImplementation(async event=>({data:{...row(event),text_zones:[zone]},error:null}));const {result}=await loaded();
 act(()=>{void result.current.updateSettings({text_zones:[{...zone,text:'O'}]});void result.current.updateSettings({text_zones:[{...zone,text:'On'}]});void result.current.updateSettings({text_zones:[{...zone,text:'One'}]});});
 act(()=>{void result.current.undo();});expect(result.current.settings?.text_zones[0].text).toBe('Original');
 act(()=>{void result.current.updateSettings({text_zones:[{...zone,x_percent:60}]},{historyGroup:false});void result.current.updateSettings({text_zones:[{...zone,x_percent:70}]},{historyGroup:false});});expect(result.current.canRedo).toBe(false);
 act(()=>{void result.current.undo();});expect(result.current.settings?.text_zones[0].x_percent).toBe(60);
 act(()=>{void result.current.undo();});expect(result.current.settings?.text_zones[0].x_percent).toBe(50);
});
