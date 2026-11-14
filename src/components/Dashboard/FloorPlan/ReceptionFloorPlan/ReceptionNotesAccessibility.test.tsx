import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {VendorNotesPanel} from './VendorNotesPanel';
import {TableNotePanel} from './TableNotePanel';
afterEach(cleanup);
describe('Reception note controls',()=>{
 it('names the vendor notes control and limits edits to 4000 characters',()=>{const onChange=vi.fn();render(<VendorNotesPanel plan={{vendor_notes:''} as any} onChange={onChange}/>);const field=screen.getByRole('textbox',{name:'Vendor Setup Notes'});expect(field).toHaveAttribute('maxlength','4000');fireEvent.change(field,{target:{value:'x'.repeat(4001)}});expect(onChange.mock.calls[0][0]({}).vendor_notes).toHaveLength(4000);});
 it('names the selected table note and changes only that table',()=>{const onChange=vi.fn();const plan={table_positions:[{table_id:'one',note:''},{table_id:'two',note:'Keep this'}]}as any;render(<TableNotePanel plan={plan} tables={[{id:'one',name:'Family Table'}]as any} selectedTableId="one" onClose={()=>{}} onChange={onChange}/>);fireEvent.change(screen.getByRole('textbox',{name:'Table note for Family Table'}),{target:{value:'Wheelchair access'}});expect(onChange.mock.calls[0][0](plan).table_positions).toEqual([{table_id:'one',note:'Wheelchair access'},{table_id:'two',note:'Keep this'}]);});
});
