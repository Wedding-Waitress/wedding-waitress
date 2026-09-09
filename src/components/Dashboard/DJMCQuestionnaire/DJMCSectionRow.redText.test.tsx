import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
vi.mock('@dnd-kit/sortable',()=>({useSortable:()=>({attributes:{},listeners:{},setNodeRef:vi.fn(),transform:null,transition:null,isDragging:false})}));

vi.mock('./DJMCPronunciationRecorder',()=>({DJMCPronunciationRecorder:()=>null}));
vi.mock('@/components/ui/dropdown-menu',()=>({DropdownMenu:({children}:any)=><div>{children}</div>,DropdownMenuTrigger:({children}:any)=><>{children}</>,DropdownMenuContent:({children}:any)=><div>{children}</div>,DropdownMenuItem:({children,onClick,disabled}:any)=><button disabled={disabled} onClick={onClick}>{children}</button>,DropdownMenuSeparator:()=>null}));
import {DJMCSectionRow} from './DJMCSectionRow';
import theme from './DJMCQuestionnaireTheme.module.css';
afterEach(cleanup);
it.each(['do_not_play','speeches'] as const)('toggles red independently of bold for %s rows',sectionType=>{
 const item:any={id:'row',row_label:'Welcome',value_text:'Alex',is_section_header:false};
 const onUpdate=vi.fn();const props={eventId:'event',sectionType,onUpdate,onDelete:vi.fn(),onDuplicate:vi.fn()};
 const {rerender,container}=render(<DJMCSectionRow {...props} item={item}/>);
 expect(screen.getByRole('button',{name:'Row actions'})).toHaveAttribute('title','Row actions');
 expect(screen.getByRole('button',{name:'Undo'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Make Row Text Red'}));
 expect(onUpdate).toHaveBeenCalledWith({is_section_header:true});
 rerender(<DJMCSectionRow {...props} item={{...item,is_section_header:true}}/>);
 expect(container.firstChild).toHaveClass(theme.redRowText);
 fireEvent.click(screen.getByRole('button',{name:'Undo'}));
 expect(onUpdate).toHaveBeenLastCalledWith({is_section_header:false});
 expect(screen.getByRole('button',{name:'Undo'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:/Restore Normal Text Colour/}));
 expect(onUpdate).toHaveBeenLastCalledWith({is_section_header:false});
 rerender(<DJMCSectionRow {...props} item={item}/>);
 expect(container.firstChild).not.toHaveClass(theme.redRowText);
});

it('renders one editable field per custom column and keeps drag and row actions',()=>{
 const onUpdate=vi.fn();const item:any={id:'custom',row_label:'Existing',custom_values:{extra:'Keep'}};
 const columns:any=[{id:'row_label',source:'row_label',label:'Name'},{id:'extra',label:'Details'},{id:'new',label:'Third'}];
 const props={eventId:'event',sectionType:'cocktail' as const,onUpdate,onDelete:vi.fn(),onDuplicate:vi.fn()};
 const {rerender}=render(<DJMCSectionRow {...props} item={item} columns={columns}/>);
 expect(screen.getByRole('textbox',{name:'Name'})).toHaveValue('Existing');
 expect(screen.getByRole('textbox',{name:'Details'})).toHaveValue('Keep');
 fireEvent.change(screen.getByRole('textbox',{name:'Third'}),{target:{value:'New content'}});
 expect(onUpdate).toHaveBeenCalledWith({custom_values:{extra:'Keep',new:'New content'}});
 rerender(<DJMCSectionRow {...props} item={item} columns={[...columns,{id:'four',label:'Fourth'}]}/>);
 expect(screen.getByRole('textbox',{name:'Fourth'})).toHaveValue('');
 expect(screen.getByRole('button',{name:'Row actions'})).toBeVisible();
});

it.each(['https://www.youtube.com/watch?v=vdUtt0qZ4W4','https://open.spotify.com/track/123','https://music.apple.com/au/album/example/123'])('recognises a link in an arbitrary custom column and clears only that cell: %s',url=>{
 const onUpdate=vi.fn();
 const item:any={id:'links',row_label:'Song 1',custom_values:{duties:url,other:'Keep this'}};
 render(<DJMCSectionRow item={item} columns={[{id:'duties',label:'Duties'}]} eventId="event" sectionType="cocktail" onUpdate={onUpdate} onDelete={vi.fn()} onDuplicate={vi.fn()}/>);
 expect(screen.getByRole('textbox',{name:'Duties'})).toHaveValue(url);
 expect(screen.getByRole('button',{name:'Preview music link'})).toBeVisible();
 expect(screen.getByRole('button',{name:'Copy music link'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Clear music link'}));
 expect(onUpdate).toHaveBeenLastCalledWith({custom_values:{duties:'',other:'Keep this'}});
 fireEvent.click(screen.getByRole('button',{name:'Undo'}));
 expect(onUpdate).toHaveBeenLastCalledWith({custom_values:{duties:url,other:'Keep this'}});
});
