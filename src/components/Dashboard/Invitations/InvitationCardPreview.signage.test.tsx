import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationCardPreview } from './InvitationCardPreview';

describe('Signage paper preview zoom', () => {
  let resizeCallbacks: Array<() => void>;
  beforeEach(() => {
    resizeCallbacks = [];
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resizeCallbacks.push(callback); }
      observe() {} unobserve() {} disconnect() {}
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 1200, x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 1200, toJSON: () => ({}) });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('does not restore event text after a preset zone is explicitly cleared',()=>{
 render(<InvitationCardPreview settings={{background_color:'#fff',text_zones:[{id:'name',label:'Event Name',type:'preset',preset_field:'event_name',text:'',font_family:'Lora',font_size:28,font_color:'#000',text_align:'center',x_percent:50,y_percent:50,width_percent:80,rotation:0}]} as any} eventData={{event_name:'Previously filled event'}} paperSize={{widthMm:594,heightMm:841}}/>);
 expect(screen.queryByText('Previously filled event')).not.toBeInTheDocument();
 });

  it('fits the editing width and does not undo button zoom after a height-only resize', () => {
    const documentRef = React.createRef<HTMLDivElement>();
    render(<InvitationCardPreview settings={null} eventData={{}} paperSize={{ widthMm: 594, heightMm: 841 }} documentRef={documentRef} fitToContainer backgroundFit="cover" />);
    expect(screen.getByText('35%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('45%')).toBeInTheDocument();
    act(() => { resizeCallbacks.forEach(callback => callback()); });
    expect(screen.getByText('45%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(documentRef.current?.style.width).toBe('594mm');
    expect(documentRef.current?.style.height).toBe('841mm');
  });

  it('keeps fixed signage at 40 percent through resize without zoom controls or paper reflow', () => {
    const documentRef = React.createRef<HTMLDivElement>();
    render(<InvitationCardPreview settings={null} eventData={{}} paperSize={{ widthMm: 594, heightMm: 841 }} documentRef={documentRef} fitToContainer fixedZoomPercent={40} backgroundFit="cover" />);
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zoom out' })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(documentRef.current?.style.transform).toBe('scale(0.4)');
    expect(documentRef.current?.style.width).toBe('594mm');
    expect(documentRef.current?.style.height).toBe('841mm');
    act(() => { resizeCallbacks.forEach(callback => callback()); window.dispatchEvent(new Event('resize')); });
    expect(documentRef.current?.style.transform).toBe('scale(0.4)');
  });

  it.each(['A4','A5','A6'])('matches the A1 sign display width for %s without changing print dimensions', cardSize => {
    const documentRef = React.createRef<HTMLDivElement>();
    render(<InvitationCardPreview settings={{card_size:cardSize,orientation:'portrait',text_zones:[]} as any} eventData={{}} documentRef={documentRef} fitToContainer fitToWidth fixedPreviewWidthMm={237.6} />);
    const paperWidth = {A4:210,A5:148,A6:105}[cardSize]!;
    expect(documentRef.current?.style.width).toBe(paperWidth+'mm');
    expect(documentRef.current?.style.transform).toBe('scale('+(237.6/paperWidth)+')');
    expect(parseFloat(documentRef.current!.parentElement!.style.width)).toBeCloseTo(594*96/25.4*.4,5);
    expect(screen.queryByRole('button',{name:'Zoom in'})).not.toBeInTheDocument();
    act(() => { resizeCallbacks.forEach(callback => callback()); });
    expect(parseFloat(documentRef.current!.parentElement!.style.width)).toBeCloseTo(594*96/25.4*.4,5);
  });
});
