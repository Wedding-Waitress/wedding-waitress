import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {GuestRelationField} from './GuestRelationField';
import {publicHostRelationLabels} from '@/i18n/publicGuestRelationLabels';
const language=vi.hoisted(()=>({value:'en'}));
vi.mock('react-i18next',()=>({useTranslation:()=>({i18n:{language:language.value,resolvedLanguage:language.value}})}));
afterEach(cleanup);
describe('universal guest relationship self roles',()=>{
  it.each(Object.keys(publicHostRelationLabels))('offers and saves the same host role in %s',lang=>{
    language.value=lang;const onChange=vi.fn();const labels=publicHostRelationLabels[lang];
    render(<GuestRelationField context={{partner1_name:'Alex',partner2_name:'Casey',relation_mode:'two'}} value={{relation_partner:'',relation_role:'',custom_relation:''}} onChange={onChange}/>);
    fireEvent.click(screen.getByRole('button',{name:'Assign Relation'}));
    expect(screen.getAllByRole('button',{name:labels.organizer,exact:true})).toHaveLength(2);
    expect(screen.getAllByRole('button',{name:labels.bride,exact:true})).toHaveLength(1);
    expect(screen.getAllByRole('button',{name:labels.groom,exact:true})).toHaveLength(1);
    fireEvent.click(screen.getByRole('button',{name:labels.groom,exact:true}));fireEvent.click(screen.getByRole('button',{name:'Select',exact:true}));
    expect(onChange).toHaveBeenCalledWith({relation_partner:'partner_two',relation_role:'groom',custom_relation:''});
  });
  it('offers Organizer for a single-person event',()=>{
    language.value='en';render(<GuestRelationField context={{partner1_name:'Alex',relation_mode:'single'}} value={{relation_partner:'',relation_role:'',custom_relation:''}} onChange={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'Assign Relation'}));
    expect(screen.getAllByRole('button',{name:'Organizer',exact:true})).toHaveLength(1);
  });
});
