import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  probe: vi.fn(), signed: vi.fn(), validate: vi.fn(), path: vi.fn(), remove: vi.fn(),
  upload: vi.fn(), getUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    storage: { from: () => ({ upload: mocks.upload }) },
  },
}));

vi.mock('@/lib/eventImage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/eventImage')>()),
  probeEventImageStorage: mocks.probe,
  createEventImageSignedUrl: mocks.signed,
  validateEventImageFile: mocks.validate,
  eventImageObjectPath: mocks.path,
  removeEventImageIfUnreferenced: mocks.remove,
}));

import { EventImageEditor } from './EventImageEditor';

const context = { kind: 'draft' as const, ownerId: 'user-1', draftId: 'draft-1' };

describe('EventImageEditor', () => {
  beforeEach(() => {
    mocks.probe.mockReset();
    mocks.signed.mockReset();
    mocks.validate.mockReset();
    mocks.path.mockReset();
    mocks.remove.mockReset();
    mocks.upload.mockReset();
    mocks.getUser.mockReset();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.signed.mockResolvedValue('https://signed.test/image');
    mocks.remove.mockResolvedValue(true);
  });

  it('keeps the interface visible and explains when the local storage contract is unavailable', async () => {
    mocks.probe.mockRejectedValue(new Error('Bucket not found'));
    render(<EventImageEditor heading="Add a photo of you both" context={context} value={null} onChange={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Add a photo of you both' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i);
    expect(screen.getByRole('button', { name: 'Upload Photo or Logo' })).toBeDisabled();
  });

  it('shows the compact preview and labelled display, replace and remove controls', async () => {
    mocks.probe.mockResolvedValue(undefined);
    mocks.signed.mockResolvedValue('https://signed.test/image');
    render(<EventImageEditor
      heading="Add an event photo or logo"
      context={context}
      value={{ path: 'user-1/drafts/draft-1/image.jpg', fit: 'cover', positionX: 50, positionY: 50, zoom: 100 }}
      onChange={vi.fn()}
    />);

    expect(await screen.findByAltText('Event photo or logo preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fill Frame' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fit Logo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Horizontal position')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Vertical position')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Zoom')).toHaveValue('100');
    expect(screen.getByLabelText('Draggable event image editor')).toBeInTheDocument();
  });

  it('uploads, persists and safely replaces an existing image', async () => {
    mocks.probe.mockResolvedValue(undefined);
    const file = new File(['image'], 'couple.jpg', { type: 'image/jpeg' });
    mocks.validate.mockResolvedValue({ file, mime: 'image/jpeg' });
    mocks.path.mockReturnValue('user-1/drafts/draft-1/new.jpg');
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<EventImageEditor
      heading="Add a photo of you both"
      context={context}
      value={{ path: 'user-1/drafts/draft-1/old.jpg', fit: 'cover', positionX: 40, positionY: 60, zoom: 135 }}
      onChange={onChange}
    />);

    await screen.findByAltText('Event photo or logo preview');
    fireEvent.change(screen.getByLabelText('Choose an event photo or logo'), { target: { files: [file] } });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({
      path: 'user-1/drafts/draft-1/new.jpg', fit: 'cover', positionX: 50, positionY: 50, zoom: 100,
    }));
    expect(mocks.upload).toHaveBeenCalledWith('user-1/drafts/draft-1/new.jpg', file, expect.objectContaining({ upsert: false }));
    expect(mocks.remove).toHaveBeenCalledWith('user-1/drafts/draft-1/old.jpg');
  });

  it('clears the persisted pointer before removing the stored object', async () => {
    mocks.probe.mockResolvedValue(undefined);
    const calls: string[] = [];
    const onChange = vi.fn(async () => { calls.push('pointer'); });
    mocks.remove.mockImplementation(async () => { calls.push('object'); return true; });
    render(<EventImageEditor
      heading="Add an event photo or logo"
      context={context}
      value={{ path: 'user-1/drafts/draft-1/old.jpg', fit: 'contain', positionX: 50, positionY: 50, zoom: 100 }}
      onChange={onChange}
    />);

    await screen.findByAltText('Event photo or logo preview');
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
    expect(calls).toEqual(['pointer', 'object']);
  });

  it.each(['mouse', 'touch'])('repositions with %s pointer dragging and persists the result', async (pointerType) => {
    mocks.probe.mockResolvedValue(undefined);
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<EventImageEditor heading="Add a photo of you both" context={context}
      value={{ path: 'user-1/drafts/draft-1/image.jpg', fit: 'cover', positionX: 50, positionY: 50, zoom: 100 }} onChange={onChange} />);

    const editor = await screen.findByLabelText('Draggable event image editor');
    vi.spyOn(editor, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 100, x: 0, y: 0, top: 0, left: 0, right: 100, bottom: 100, toJSON: () => ({}) });
    fireEvent.pointerDown(editor, { pointerId: 7, pointerType, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(editor, { pointerId: 7, pointerType, clientX: 80, clientY: 70 });
    expect(screen.getByAltText('Event photo or logo preview')).toHaveStyle({ objectPosition: '20% 30%' });
    fireEvent.pointerUp(editor, { pointerId: 7, pointerType, clientX: 80, clientY: 70 });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ positionX: 20, positionY: 30 })));
  });

  it('clamps dragging, supports arrow keys, zooms and resets the crop', async () => {
    mocks.probe.mockResolvedValue(undefined);
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<EventImageEditor heading="Add an event photo or logo" context={context}
      value={{ path: 'user-1/drafts/draft-1/image.jpg', fit: 'cover', positionX: 50, positionY: 50, zoom: 100 }} onChange={onChange} />);

    const editor = await screen.findByLabelText('Draggable event image editor');
    vi.spyOn(editor, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 100, x: 0, y: 0, top: 0, left: 0, right: 100, bottom: 100, toJSON: () => ({}) });
    fireEvent.pointerDown(editor, { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(editor, { pointerId: 2, pointerType: 'mouse', clientX: -500, clientY: 500 });
    fireEvent.pointerUp(editor, { pointerId: 2, pointerType: 'mouse', clientX: -500, clientY: 500 });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ positionX: 100, positionY: 0 })));

    fireEvent.keyDown(editor, { key: 'ArrowLeft' });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ positionX: 98, positionY: 0 })));
    const zoom = screen.getByLabelText('Zoom');
    fireEvent.change(zoom, { target: { value: '175' } });
    expect(screen.getByText('175%')).toBeInTheDocument();
    fireEvent.blur(zoom);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 175 })));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Position' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ positionX: 50, positionY: 50, zoom: 100 })));
  });

  it('disables Fit Logo crop controls and restores the prior Fill Frame crop', async () => {
    mocks.probe.mockResolvedValue(undefined);
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<EventImageEditor heading="Add an event photo or logo" context={context}
      value={{ path: 'user-1/drafts/draft-1/logo.webp', fit: 'cover', positionX: 32, positionY: 68, zoom: 150 }} onChange={onChange} />);
    await screen.findByLabelText('Draggable event image editor');

    fireEvent.click(screen.getByRole('button', { name: 'Fit Logo' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ fit: 'contain', positionX: 32, positionY: 68, zoom: 150 })));
    expect(screen.queryByLabelText('Zoom')).not.toBeInTheDocument();
    expect(screen.getByText(/complete logo is displayed/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Event logo preview showing the complete logo')).toHaveAttribute('tabindex', '-1');
    fireEvent.click(screen.getByRole('button', { name: 'Fill Frame' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ fit: 'cover', positionX: 32, positionY: 68, zoom: 150 })));
    expect(screen.getByLabelText('Zoom')).toHaveValue('150');
  });
});
