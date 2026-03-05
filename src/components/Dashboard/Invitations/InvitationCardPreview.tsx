import React from 'react';
import { InvitationCardSettings, TextZone } from '@/hooks/useInvitationCardSettings';
import { Button } from "@/components/ui/enhanced-button";
import { ExternalLink } from 'lucide-react';

interface InvitationCardPreviewProps {
  settings: InvitationCardSettings | null;
  eventData: Record<string, string>;
}

const getTextTransform = (textCase: string): React.CSSProperties['textTransform'] => {
  switch (textCase) {
    case 'uppercase': return 'uppercase';
    case 'lowercase': return 'lowercase';
    case 'capitalize': return 'capitalize';
    default: return 'none';
  }
};

export const InvitationCardPreview: React.FC<InvitationCardPreviewProps> = ({
  settings,
  eventData,
}) => {
  const currentSettings = settings || {
    background_color: '#ffffff',
    background_image_url: null,
    background_image_type: 'none' as const,
    background_image_x_position: 50,
    background_image_y_position: 50,
    background_image_opacity: 100,
    text_zones: [] as TextZone[],
    font_color: '#000000',
    card_size: 'A4',
    orientation: 'portrait',
  };

  const isLandscape = currentSettings.orientation === 'landscape';

  // Dimensions map in mm
  const SIZE_MAP: Record<string, { w: number; h: number }> = {
    A4: { w: 210, h: 297 },
    A5: { w: 148, h: 210 },
    A6: { w: 105, h: 148 },
  };
  const dims = SIZE_MAP[currentSettings.card_size] || SIZE_MAP.A5;
  const previewWidth = isLandscape ? `${dims.h}mm` : `${dims.w}mm`;
  const previewHeight = isLandscape ? `${dims.w}mm` : `${dims.h}mm`;

  const textZones = currentSettings.text_zones || [];

  const getZoneText = (zone: TextZone): string => {
    if (zone.text) return zone.text;
    if (zone.type === 'preset' && zone.preset_field) {
      return eventData[zone.preset_field] || '';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <div className="flex justify-center">
          <div
            style={{
              width: previewWidth,
              height: previewHeight,
              backgroundColor: currentSettings.background_color,
              maxWidth: '100%',
            }}
            className="bg-white shadow-lg overflow-hidden relative"
          >
            {/* Background Image */}
            {currentSettings.background_image_url && currentSettings.background_image_type === 'full' && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${currentSettings.background_image_url})`,
                  backgroundPosition: `${currentSettings.background_image_x_position || 50}% ${currentSettings.background_image_y_position || 50}%`,
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
                  opacity: (currentSettings.background_image_opacity || 100) / 100,
                }}
              />
            )}

            {/* Text Zones */}
            {textZones.map((zone) => {
              const text = getZoneText(zone);
              if (!text) return null;

              return (
                <div
                  key={zone.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${zone.x_percent - zone.width_percent / 2}%`,
                    top: `${zone.y_percent}%`,
                    width: `${zone.width_percent}%`,
                    transform: 'translateY(-50%)',
                    fontFamily: zone.font_family,
                    fontSize: `${zone.font_size}px`,
                    color: zone.font_color,
                    fontWeight: zone.font_weight === 'bold' ? '700' : '400',
                    fontStyle: zone.font_style === 'italic' ? 'italic' : 'normal',
                    textAlign: zone.text_align as any,
                    textTransform: getTextTransform(zone.text_case),
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.3,
                  }}
                >
                  {text}
                </div>
              );
            })}

            {/* Empty state */}
            {textZones.length === 0 && !currentSettings.background_image_url && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">Invitation Preview</p>
                  <p className="text-sm">Add text zones and a background image to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit in Canva */}
        {settings?.canva_template_url && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <Button
              onClick={() => window.open(settings.canva_template_url!, '_blank')}
              variant="outline"
              className="rounded-full flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Edit in Canva
            </Button>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Want more design freedom? Click 'Edit in Canva' to customise this invitation using Canva's full editor. After downloading your design as PNG or PDF, return here and upload your finished invitation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
