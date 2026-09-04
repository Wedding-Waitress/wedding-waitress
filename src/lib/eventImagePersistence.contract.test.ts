import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('event image persistence contract', () => {
  const guided = read('src/lib/guidedEventSetup.ts');
  const events = read('src/hooks/useEvents.ts');
  const edit = read('src/components/Dashboard/EventEditModal.tsx');
  const table = read('src/components/Dashboard/EventsTable.tsx');
  const editorCss = read('src/components/EventImage/EventImageEditor.module.css');

  it('copies draft media metadata into the created event', () => {
    expect(guided).toContain('event_image_path: answers.eventImagePath || null');
    expect(guided).toContain("event_image_fit: answers.eventImageFit === 'contain' ? 'contain' : 'cover'");
    expect(guided).toContain('event_image_position_x: answers.eventImagePositionX ?? 50');
    expect(guided).toContain('event_image_position_y: answers.eventImagePositionY ?? 50');
    expect(guided).toContain('event_image_zoom: answers.eventImageZoom ?? 100');
  });

  it('loads saved event media while retaining a pre-migration dashboard fallback', () => {
    expect(events).toContain('event_image_path, event_image_fit, event_image_position_x, event_image_position_y, event_image_zoom');
    expect(events).toContain('event_image_zoom: extraData.event_image_zoom ?? 100');
    expect(events).toContain('if (fullErr && isEventImageZoomBackendUnavailable(fullErr))');
    expect(events).toContain('select(eventImageFieldsWithoutZoom)');
    expect(events).toContain('if (fullErr && isEventImageBackendUnavailable(fullErr))');
    expect(events).toContain("supabase.from('events').select(additionalFields)");
  });

  it('exposes the same replace and remove editor from My Events Edit Event', () => {
    expect(edit).toContain('<EventImageEditor');
    expect(edit).toContain('onImageChange(event.id, value)');
    expect(edit).toContain('zoom: event.event_image_zoom ?? 100');
    expect(table).toContain('event_image_zoom: value?.zoom ?? 100');
  });

  it('keeps pointer interaction compact and responsive on mouse, touch and mobile', () => {
    expect(editorCss).toContain('cursor: grab');
    expect(editorCss).toContain('cursor: grabbing');
    expect(editorCss).toContain('touch-action: none');
    expect(editorCss).toContain('@media (max-width: 600px)');
    expect(editorCss).toContain('.workspace { flex-direction: column; }');
  });
});
