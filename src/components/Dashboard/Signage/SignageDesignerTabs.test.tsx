import type { InvitationCardSettings } from '@/hooks/useInvitationCardSettings';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvitationCardCustomizer } from '../Invitations/InvitationCardCustomizer';

vi.mock('../Invitations/InvitationGalleryModal',()=>({InvitationGalleryModal:()=>null}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

afterEach(cleanup);

describe('Seating Chart Signs designer tabs', () => {
  it('keeps text, style, notes and custom-zone actions in sync with saved settings',async()=>{
   const save=vi.fn();function Editor(){const[settings,set]=React.useState<Pick<InvitationCardSettings,'background_color'|'notes'|'text_zones'>>({background_color:'#ffffff',notes:'',text_zones:[{id:'name',label:'Event Name',type:'preset',preset_field:'event_name',text:'Initial event',font_family:'Lora',font_size:28,font_color:'#000000',font_weight:'400',font_style:'normal',text_align:'center',text_case:'default',x_percent:50,y_percent:50,width_percent:80,rotation:0}]});return <InvitationCardCustomizer settings={settings as any} onSettingsChange={async changes=>{save(changes);set(s=>({...s,...changes}));return true}} onNotesChange={async notes=>{set(s=>({...s,notes}));return true}} notes={settings.notes} eventData={{event_name:'Fallback event'}} signageTypography/>;}
   render(<Editor/>);fireEvent.change(screen.getByRole('textbox',{name:'Event Name text content'}),{target:{value:''}});expect(screen.getByRole('textbox',{name:'Event Name text content'})).toHaveValue('');
   for(const[control,option,field,value]of [['font size','64px','font_size',64],['text style','Bold','font_style','bold'],['alignment','Left','text_align','left'],['text case','UPPERCASE','text_case','uppercase']] as const){fireEvent.keyDown(screen.getByRole('combobox',{name:'Event Name '+control}),{key:'ArrowDown'});fireEvent.click(screen.getByRole('option',{name:option}));await waitFor(()=>expect(save).toHaveBeenLastCalledWith(expect.objectContaining({text_zones:[expect.objectContaining({[field]:value})]})));}
   fireEvent.click(screen.getByRole('button',{name:'Add Custom Text Zone'}));expect(screen.getAllByRole('textbox')).toHaveLength(2);fireEvent.click(screen.getAllByRole('button',{name:'Delete text zone'})[1]);expect(screen.getAllByRole('textbox')).toHaveLength(1);
   fireEvent.mouseDown(screen.getByRole('tab',{name:'Messages'}),{button:0,ctrlKey:false});fireEvent.change(screen.getByRole('textbox',{name:'Notes / Caption'}),{target:{value:'Internal print note'}});expect(screen.getByRole('textbox',{name:'Notes / Caption'})).toHaveValue('Internal print note');fireEvent.click(screen.getByRole('button',{name:'Reset to Default'}));await waitFor(()=>expect(screen.getByRole('textbox',{name:'Notes / Caption'})).toHaveValue(''));
  });

  it('keeps a hidden QR available to show again', () => {
    const save = vi.fn().mockResolvedValue(true);
    render(<InvitationCardCustomizer settings={{ background_color: '#ffffff', text_zones: [], qr_config: { enabled: false, event_id: 'test-event' } } as any} onSettingsChange={save} eventData={{}} signageTypography />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Add QR Code' }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('switch'));
    expect(save).toHaveBeenCalledWith({ qr_config: { enabled: true, event_id: 'test-event' } });
  });

  it('shows the saved zero opacity instead of replacing it with 100%', () => {
    render(<InvitationCardCustomizer settings={{ background_color: '#ffffff', background_image_type: 'full', background_image_url: '/test.png', background_image_opacity: 0, text_zones: [] } as any} onSettingsChange={vi.fn()} eventData={{}} signageTypography />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Background' }), { button: 0, ctrlKey: false });
    expect(screen.getByRole('combobox')).toHaveTextContent('0%');
  });

  it('opens the correct content and moves the active state across all four tabs', () => {
    render(
      <InvitationCardCustomizer
        settings={null}
        onSettingsChange={vi.fn().mockResolvedValue(true)}
        eventData={{}}
        appearance="signage-premium"
        headerTitle="QR Code Seating Chart & Wedding Sign Designer"
        textZonesIntro="Add text zones to your sign."
        qrTabTitle="Add QR Code to Sign"
      />,
    );

    const cases = [
      { name: 'Text Zones', content: 'Add text zones to your sign.' },
      { name: 'Background', content: 'Background Image' },
      { name: 'Add QR Code', content: 'Add QR Code to Sign' },
      { name: 'Messages', content: 'Notes / Caption' },
    ];

    for (const current of cases) {
      const tab = screen.getByRole('tab', { name: current.name });
      fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
      expect(tab).toHaveAttribute('data-state', 'active');
      expect(screen.getByText(current.content)).toBeVisible();

      for (const other of cases.filter((candidate) => candidate.name !== current.name)) {
        expect(screen.getByRole('tab', { name: other.name })).toHaveAttribute('data-state', 'inactive');
      }
    }
  });

  it('names the controls for each sign text zone',()=>{
 render(<InvitationCardCustomizer settings={{background_color:'#fff',text_zones:[{id:'name',label:'Event Name',type:'preset',preset_field:'event_name',text:'My event',font_family:'Lora',font_size:28,font_color:'#000000',text_align:'center'}]} as any} onSettingsChange={vi.fn()} eventData={{}} signageTypography/>);
 expect(screen.getByRole('textbox',{name:'Event Name text content'})).toHaveValue('My event');
 for(const name of ['Event Name font','Event Name font size','Event Name text style','Event Name alignment','Event Name text case'])expect(screen.getByRole('combobox',{name})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Event Name font color: #000000'})).toBeInTheDocument();
 fireEvent.mouseDown(screen.getByRole('tab',{name:'Messages'}),{button:0,ctrlKey:false});expect(screen.getByRole('textbox',{name:'Notes / Caption'})).toBeInTheDocument();
 });

  it('keeps explicitly cleared preset text blank',()=>{
 render(<InvitationCardCustomizer settings={{background_color:'#fff',text_zones:[{id:'name',label:'Event Name',type:'preset',preset_field:'event_name',text:'',font_family:'Lora',font_size:28,font_color:'#000',text_align:'center'}]} as any} onSettingsChange={vi.fn()} eventData={{event_name:'Previously filled event'}} signageTypography/>);
 expect(screen.getByRole('textbox')).toHaveValue('');
 });

  it('keeps one shared frame, inline icons, borderless inactive tabs, and the approved active treatment', () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/Dashboard/Signage/SignagePage.module.css'),
      'utf8',
    );

    expect(css).toMatch(/ww-signage-premium-designer\) \[role="tablist"\][^{]*\{[\s\S]*?display:\s*grid\s*!important;[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);[\s\S]*?padding:\s*0\.25rem\s*!important;[\s\S]*?border-radius:\s*999px\s*!important;/);
    expect(css).toMatch(/ww-signage-premium-designer\) \[role="tab"\][^{]*\{[\s\S]*?flex-direction:\s*row\s*!important;[\s\S]*?border:\s*0\s*!important;[\s\S]*?box-shadow:\s*none\s*!important;[\s\S]*?white-space:\s*nowrap\s*!important;/);
    expect(css).toMatch(/\[role="tab"\]\[data-state="active"\][^{]*\{[\s\S]*?background:\s*linear-gradient\(180deg, #4ade80 0%, #22c55e 58%, #16a34a 100%\)\s*!important;[\s\S]*?0 7px 16px rgba\(22, 101, 52, 0\.22\)\s*!important;/);
    expect(css).toMatch(/@media \(max-width: 480px\)[\s\S]*?ww-signage-premium-designer\) \[role="tab"\][^{]*\{[\s\S]*?min-height:\s*2\.75rem\s*!important;[\s\S]*?flex-direction:\s*row\s*!important;[\s\S]*?font-size:\s*clamp\(8px, 2\.3vw, 11px\)\s*!important;/);
  });
});
