import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sign: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
  toast: vi.fn(),
  preview:vi.fn(),play:vi.fn(),playback:vi.fn(),
}));

vi.mock('@/lib/djmcPronunciationStorage', () => ({
  createDJMCPronunciationSignedUrl: mocks.sign,
  deleteDJMCPronunciation: mocks.remove,
  uploadDJMCPronunciation: mocks.upload,
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useAdminPreviewMedia',()=>({useAdminPreviewMedia:mocks.preview}));

import { DJMCPronunciationRecorder } from './DJMCPronunciationRecorder';
import {ReadOnlyAccountPreviewProvider} from '@/contexts/ReadOnlyAccountPreviewContext';

const eventId = '20000000-0000-4000-8000-000000000002';
const itemId = '30000000-0000-4000-8000-000000000003';
const path = `10000000-0000-4000-8000-000000000001/${eventId}/${itemId}/40000000-0000-4000-8000-000000000004.webm`;

describe('DJMCPronunciationRecorder secure lifecycle', () => {
  it('allows read-only preview playback without exposing recording mutations',async()=>{
    const onChange=vi.fn();
    render(<ReadOnlyAccountPreviewProvider customerId="customer-fixture"><DJMCPronunciationRecorder audioPath={path} eventId={eventId} itemId={itemId} onChange={onChange} disabled/></ReadOnlyAccountPreviewProvider>);
    expect(screen.getByRole('button',{name:'Play recording'})).toBeEnabled();
    expect(screen.queryByRole('button',{name:'Delete recording'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Record pronunciation'})).not.toBeInTheDocument();
    expect(mocks.preview).toHaveBeenCalledWith('customer-fixture',eventId,'questionnaire_audio',itemId,true);
    fireEvent.click(screen.getByRole('button',{name:'Play recording'}));
    await waitFor(()=>expect(mocks.play).toHaveBeenCalled());
    expect(mocks.playback).toHaveBeenCalledWith('https://verified-preview.example/recording');
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();expect(mocks.upload).not.toHaveBeenCalled();expect(onChange).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sign.mockResolvedValue('https://signed.example/recording');
    mocks.remove.mockResolvedValue(undefined);
    mocks.preview.mockImplementation((_customer:string,_event:string,_kind:string,_item:string,enabled:boolean)=>({url:enabled?'https://verified-preview.example/recording':null,error:false,loading:false}));
    mocks.play.mockResolvedValue(undefined);
    vi.stubGlobal('Audio',class {onended=null;constructor(url:string){mocks.playback(url);}play=mocks.play;pause(){}});
  });
  afterEach(()=>vi.unstubAllGlobals());

  it('removes the storage object before clearing the saved database path', async () => {
    const onChange = vi.fn();
    render(<DJMCPronunciationRecorder audioPath={path} eventId={eventId} itemId={itemId} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete recording' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(path, { eventId, itemId, shareToken: undefined }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(onChange.mock.invocationCallOrder[0]);
  });

  it('keeps the database path when storage deletion fails', async () => {
    const onChange = vi.fn();
    mocks.remove.mockRejectedValue(new Error('Storage unavailable'));
    render(<DJMCPronunciationRecorder audioPath={path} eventId={eventId} itemId={itemId} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete recording' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete failed' })));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables public view-only recording controls', () => {
    render(
      <DJMCPronunciationRecorder
        audioPath={path}
        eventId={eventId}
        itemId={itemId}
        shareToken="share-token"
        onChange={vi.fn()}
        disabled
      />,
    );
    expect(screen.getByRole('button', { name: 'Play recording' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete recording' })).toBeDisabled();
  });

  it('preserves organiser playback for an unmigrated legacy recording without exposing it to share views', async () => {
    const legacyUrl = 'https://project.supabase.co/storage/v1/object/public/venue-logos/pronunciations/pronunciation_1.webm';
    const { rerender } = render(
      <DJMCPronunciationRecorder audioPath={null} legacyAudioUrl={legacyUrl} eventId={eventId} itemId={itemId} onChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Play recording' })).toBeInTheDocument();
    expect(mocks.sign).not.toHaveBeenCalled();

    rerender(
      <DJMCPronunciationRecorder audioPath={null} legacyAudioUrl={legacyUrl} eventId={eventId} itemId={itemId} shareToken="share-token" onChange={vi.fn()} />,
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Play recording' })).not.toBeInTheDocument());
  });
});
