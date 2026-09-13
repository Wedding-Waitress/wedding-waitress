import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {DJMCQuestionnaire} from '@/types/djMCQuestionnaire';
import {AdminReadOnlyQuestionnaire} from './AdminReadOnlyQuestionnaire';
import {useReadOnlyAccountPreview} from '@/contexts/ReadOnlyAccountPreviewContext';
const mocks=vi.hoisted(()=>({section:vi.fn(),allPdf:vi.fn(),sectionPdf:vi.fn()}));
vi.mock('@/lib/djMCQuestionnairePdfExporter',()=>({exportEntireQuestionnairePDF:mocks.allPdf,exportSectionPDF:mocks.sectionPdf}));
vi.mock('@/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection',()=>({DJMCQuestionnaireSection:(props:any)=>{
 mocks.section(props);const readOnly=useReadOnlyAccountPreview();
 return <div data-testid="saved-section" data-read-only={String(readOnly)}>{props.section.section_label}</div>;
}}));
describe('saved questionnaire read-only adapter',()=>{
 beforeEach(()=>{mocks.section.mockClear();mocks.allPdf.mockReset().mockResolvedValue(undefined);mocks.sectionPdf.mockReset().mockResolvedValue(undefined);});
 it('preserves saved blank sections and never executes organizer writes or undo callbacks',async()=>{
  const section={id:'section',section_label:'',is_collapsed:false,items:[]} as DJMCQuestionnaire['sections'][number];
  const questionnaire={id:'saved',sections:[section]} as DJMCQuestionnaire;
  const event={name:"Élodie & O’Connor",date:'2027-09-05',venue:null};
  render(<AdminReadOnlyQuestionnaire questionnaire={questionnaire} event={event} eventId="event"/>);
  const props=mocks.section.mock.lastCall![0];
  expect(props.disabled).toBe(true);expect(props.section.items).toBe(section.items);
  expect(screen.getByTestId('saved-section')).toHaveAttribute('data-read-only','true');
  const mutation=vi.fn();await props.onRunUndoable(mutation);expect(mutation).not.toHaveBeenCalled();
  props.onUpdateItem({value_text:'changed'});expect(section.items).toEqual([]);
  fireEvent.click(screen.getByRole('button',{name:'Download questionnaire PDF'}));
  await waitFor(()=>expect(mocks.allPdf).toHaveBeenCalledWith(questionnaire,{...event,id:'event'}));
  expect(mocks.sectionPdf).not.toHaveBeenCalled();
 });
 it('does not create templates for an absent saved questionnaire',()=>{
  render(<AdminReadOnlyQuestionnaire questionnaire={null} event={{name:'Event',date:null,venue:null}} eventId="event"/>);
  expect(screen.getByText('No saved DJ & MC Questionnaire recorded.')).toBeInTheDocument();
  expect(mocks.section).not.toHaveBeenCalled();expect(mocks.allPdf).not.toHaveBeenCalled();
 });
});
