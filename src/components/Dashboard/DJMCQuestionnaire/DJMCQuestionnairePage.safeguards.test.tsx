import React from 'react';import {render,screen,fireEvent,act,cleanup} from '@testing-library/react';import {vi,it,expect,afterEach} from 'vitest';
const state=vi.hoisted(()=>({loading:false,saving:false,toast:vi.fn(),exporter:vi.fn(),q:{id:'q',event_id:'one',sections:[]}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:state.toast})}));
vi.mock('@/hooks/useDJMCRowTextSize',()=>({useDJMCRowTextSize:()=>({rowTextSize:'standard',setRowTextSize:vi.fn(),loading:false})}));
vi.mock('@/hooks/useDJMCQuestionnaire',()=>({useDJMCQuestionnaire:()=>({questionnaire:state.q,loading:state.loading,saving:state.saving,shareTokens:[],calculateProgress:()=>({}),prepareUndo:vi.fn(),refetch:vi.fn()})}));
vi.mock('@/hooks/useDJMCUndo',()=>({useDJMCUndo:()=>({busy:false,canUndo:false,record:vi.fn(),run:vi.fn()})}));
vi.mock('./DJMCQuestionnaireSection',()=>({DJMCQuestionnaireSection:()=>null}));
vi.mock('./GuestSongRequestsSection',()=>({GuestSongRequestsSection:()=>null}));
vi.mock('../StandardEventSelector',()=>({StandardEventSelector:()=>null}));
vi.mock('@/lib/djMCQuestionnairePdfExporter',()=>({exportEntireQuestionnairePDF:state.exporter}));
import {DJMCQuestionnairePage} from './DJMCQuestionnairePage';
const events:any=[{id:'one',name:'Wedding',date:'2027-03-19'},{id:'two',name:'Other'}];
const page=(id='one')=><DJMCQuestionnairePage selectedEventId={id} onEventSelect={vi.fn()} events={events}/>;
afterEach(()=>{cleanup();vi.clearAllMocks();state.loading=false;state.saving=false;});
it('blocks exports while loading or saving the questionnaire',()=>{state.loading=true;render(page());expect(screen.getByRole('button',{name:'Download entire questionnaire PDF'})).toBeDisabled();expect(screen.getByRole('button',{name:'Share with DJ/MC'})).toBeDisabled();});
it('takes a single export lock and rejects an outdated event before saving',async()=>{let done:any;state.exporter.mockImplementation(()=>new Promise(r=>done=r));const {rerender}=render(page());const button=screen.getByRole('button',{name:'Download entire questionnaire PDF'});fireEvent.click(button);fireEvent.click(button);await act(async()=>{});expect(state.exporter).toHaveBeenCalledTimes(1);const isCurrent=state.exporter.mock.calls[0][3];expect(typeof isCurrent).toBe('function');expect(isCurrent()).toBe(true);rerender(page('two'));expect(isCurrent()).toBe(false);await act(async()=>done());expect(state.toast).not.toHaveBeenCalledWith(expect.objectContaining({title:'PDF Downloaded'}));});

it('does not combine a newly selected event with the previous questionnaire',()=>{render(page('two'));expect(screen.getByRole('button',{name:'Download entire questionnaire PDF'})).toBeDisabled()});
