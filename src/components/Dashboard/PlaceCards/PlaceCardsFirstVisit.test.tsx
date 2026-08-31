import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaceCardCustomizer } from './PlaceCardCustomizer';
import type { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';

vi.mock('./PlaceCardFontPicker', () => ({
  PlaceCardFontPicker: ({ value }: { value: string }) => <div data-testid="font-picker">{value}</div>,
}));

vi.mock('./PlaceCardGalleryModal', () => ({
  PlaceCardGalleryModal: () => null,
}));

vi.mock('./PlaceCardPhotoVideoQrPanel', () => ({
  PlaceCardPhotoVideoQrPanel: () => null,
}));

const legacySettings = {
  id: 'settings-legacy',
  event_id: 'event-1',
  user_id: 'user-1',
  font_family: 'Inter',
  font_color: '#000000',
  background_color: '#ffffff',
  background_image_type: 'none',
  mass_message: null,
  individual_messages: null,
  guest_font_family: null,
  info_font_family: null,
  guest_name_bold: null,
  guest_name_italic: null,
  guest_name_underline: null,
  guest_name_font_size: null,
  info_font_size: null,
  name_spacing: null,
  info_bold: false,
  info_italic: false,
  info_underline: false,
  info_font_color: '#000000',
} as unknown as PlaceCardSettings;

describe('Name Place Cards first-visit initialization', () => {
  it('renders safely while an event has no settings row yet', () => {
    render(
      <PlaceCardCustomizer
        settings={null}
        onSettingsChange={vi.fn().mockResolvedValue(true)}
        guests={[]}
        eventName="New Wedding"
        photoVideoQr={null}
        photoVideoQrLoading={false}
        photoVideoQrError={null}
      />,
    );

    expect(screen.getByText('Guest Name')).toBeInTheDocument();
  });

  it('renders a legacy nullable settings row without reaching the app error boundary', () => {
    render(
      <PlaceCardCustomizer
        settings={legacySettings}
        onSettingsChange={vi.fn().mockResolvedValue(true)}
        guests={[]}
        eventName="Legacy Wedding"
        photoVideoQr={null}
        photoVideoQrLoading={false}
        photoVideoQrError={null}
      />,
    );

    expect(screen.getByText('Guest Name')).toBeInTheDocument();
    expect(screen.getAllByText('30pt').length).toBeGreaterThan(0);
    expect(screen.getAllByText('16pt').length).toBeGreaterThan(0);
  });

  it.each([1440, 1024, 390])(
    'keeps all five navigation tabs selectable at a %ipx viewport',
    (viewportWidth) => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: viewportWidth,
      });

      render(
        <PlaceCardCustomizer
          settings={legacySettings}
          onSettingsChange={vi.fn().mockResolvedValue(true)}
          guests={[]}
          eventName="Legacy Wedding"
          photoVideoQr={null}
          photoVideoQrLoading={false}
          photoVideoQrError={null}
        />,
      );

      const tabNames = ['Design', 'Text Position', 'Background', 'Add QR Code', 'Messages'];
      const tabs = tabNames.map((name) => screen.getByRole('tab', { name }));

      tabs.forEach((tab) => {
        fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
        expect(tab).toHaveAttribute('aria-selected', 'true');
        tabs.filter((otherTab) => otherTab !== tab).forEach((otherTab) => {
          expect(otherTab).toHaveAttribute('aria-selected', 'false');
        });
      });
    },
  );
});
