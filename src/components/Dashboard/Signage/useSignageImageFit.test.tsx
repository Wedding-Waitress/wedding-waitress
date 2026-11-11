import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSignageImageFit } from './useSignageImageFit';
vi.mock('@/hooks/use-toast',()=>({toast:vi.fn()}));
let fit: ReturnType<typeof useSignageImageFit>;
function Harness(){fit=useSignageImageFit();return fit.dialog;}
const a1={label:'A1',widthMm:594,heightMm:841};
describe('sign image crop consent',()=>{
  it('measures a preview without decoding the master and cancels obsolete crop approval', async () => {
    const sources: string[] = [];
    vi.stubGlobal('Image', class { set src(url: string) { sources.push(url); } naturalWidth=1200; naturalHeight=600; decode(){return Promise.resolve();} });
    render(<Harness />);
    const cancel = new AbortController();
    let result!: Promise<boolean>;
    await act(async () => { result = fit.confirmFit('/new-master.png', a1, 50, 50, '/new-preview.png', cancel.signal); });
    expect(sources).toEqual(['/new-preview.png']);
    expect(screen.getByText('Fit your image to A1')).toBeInTheDocument();
    act(() => cancel.abort());
    expect(await result).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  beforeEach(()=>vi.stubGlobal('Image',class{src='';naturalWidth=1200;naturalHeight=600;decode(){return Promise.resolve();}}));
  afterEach(()=>{cleanup();vi.unstubAllGlobals();});
  it('keeps changes pending until approval and treats closing as cancellation',async()=>{
    render(<Harness/>);let result:Promise<boolean>;
    await act(async()=>{result=fit.confirmFit('/landscape.png',a1);});
    expect(screen.getByText('Fit your image to A1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Cancel and upload another image'}));
    expect(await result!).toBe(false);
    await act(async()=>{result=fit.confirmFit('/landscape.png',a1);});
    fireEvent.click(screen.getByRole('button',{name:'Adjust to fit'}));
    expect(await result!).toBe(true);
    expect(await fit.confirmFit('/landscape.png',a1)).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await act(async()=>{result=fit.confirmFit('/landscape.png',{label:'A0',widthMm:841,heightMm:1189});});
    expect(screen.getByText('Fit your image to A0')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Exit'}));
    expect(await result!).toBe(false);
  });
});

it.each([{label:'A4',widthMm:210,heightMm:297},{label:'A5',widthMm:148,heightMm:210},{label:'A6',widthMm:105,heightMm:148}])('uses the selected $label paper and reuses the loaded gallery image',async paper=>{
 const sources:string[]=[];
 vi.stubGlobal('Image',class{set src(url:string){sources.push(url);}naturalWidth=800;naturalHeight=400;decode(){return Promise.resolve();}});
 const {loadSignageImageSize}=await import('@/lib/signageImageCache');
 await loadSignageImageSize('/invitation-cached-thumb.jpg');
 sources.length=0;
 render(<Harness/>);let result!:Promise<boolean>;
 await act(async()=>{result=fit.confirmFit('/invitation-master.jpg',paper,50,50,'/invitation-cached-thumb.jpg');});
 expect(sources).toEqual([]);
 expect(screen.getByRole('heading',{name:'Fit your image to '+paper.label})).toBeVisible();
 expect(screen.getByLabelText('Fitted '+paper.label+' background')).toHaveStyle({aspectRatio:paper.widthMm+' / '+paper.heightMm});
 fireEvent.click(screen.getByRole('button',{name:'Adjust to fit'}));expect(await result).toBe(true);
 cleanup();vi.unstubAllGlobals();
});
