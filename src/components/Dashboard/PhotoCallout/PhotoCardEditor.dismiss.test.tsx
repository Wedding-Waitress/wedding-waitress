import React from 'react';
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {PhotoCardEditor} from './PhotoCardEditor';
import {createPhotoCard} from '@/types/photoCallout';
afterEach(cleanup);
const setup=(saving=false)=>{const onClose=vi.fn();render(<PhotoCardEditor card={createPhotoCard()} privateNote="" guests={[]} tables={[]} event={{id:'event',name:'Wedding'}} saving={saving} includeAllGuests={false} onSave={vi.fn().mockResolvedValue(true)} onClose={onClose}/>);return onClose;};
const closeBy=(method:string)=>{if(method==='outside')fireEvent.click(screen.getByTestId('photo-editor-backdrop'));else if(method==='Escape')fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});else fireEvent.click(screen.getByRole('button',{name:method}));};
describe('photo editor dismissal',()=>{
 it.each(['outside','Close photo group editor','Cancel','Escape'])('closes an unchanged form through %s',method=>{const close=setup();closeBy(method);expect(close).toHaveBeenCalledTimes(1);expect(screen.queryByRole('alertdialog')).toBeNull();});
 it.each(['outside','Close photo group editor','Cancel','Escape'])('protects pending manual names through %s',method=>{const close=setup();fireEvent.change(screen.getByLabelText('Add a name manually'),{target:{value:'Uncle John and his family'}});closeBy(method);const prompt=screen.getByRole('alertdialog');expect(close).not.toHaveBeenCalled();fireEvent.click(within(prompt).getByRole('button',{name:'Cancel'}));expect(screen.queryByRole('alertdialog')).toBeNull();expect((screen.getByLabelText('Add a name manually') as HTMLInputElement).value).toBe('Uncle John and his family');expect(close).not.toHaveBeenCalled();closeBy(method);fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'Exit'}));expect(close).toHaveBeenCalledTimes(1);});
 it('protects added names after the manual field clears',()=>{const close=setup();fireEvent.change(screen.getByLabelText('Add a name manually'),{target:{value:'Family friend'}});fireEvent.click(screen.getByRole('button',{name:'Add typed guest name'}));closeBy('outside');expect(screen.getByRole('alertdialog')).toBeTruthy();expect(close).not.toHaveBeenCalled();});
 it('protects other edits but does not count guest searches as unsaved data',()=>{const close=setup();fireEvent.change(screen.getByPlaceholderText('Search your event guest list'),{target:{value:'search only'}});closeBy('outside');expect(close).toHaveBeenCalledTimes(1);fireEvent.change(screen.getByLabelText('Group title'),{target:{value:'Family'}});closeBy('outside');expect(screen.getByRole('alertdialog')).toBeTruthy();expect(close).toHaveBeenCalledTimes(1);});
 it('ignores dismissal while saving',()=>{const close=setup(true);closeBy('outside');closeBy('Escape');expect(close).not.toHaveBeenCalled();expect(screen.queryByRole('alertdialog')).toBeNull();});
});
