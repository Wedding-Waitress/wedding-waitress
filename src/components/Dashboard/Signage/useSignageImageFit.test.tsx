import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSignageImageFit } from './useSignageImageFit';
vi.mock('@/hooks/use-toast',()=>({toast:vi.fn()}));
let fit: ReturnType<typeof useSignageImageFit>;
function Harness(){fit=useSignageImageFit();return fit.dialog;}
const a1={label:'A1',widthMm:594,heightMm:841};
describe('sign image crop consent',()=>{
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
