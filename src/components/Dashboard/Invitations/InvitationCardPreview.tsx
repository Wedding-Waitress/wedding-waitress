import React, { useRef, useCallback, useState, useMemo } from 'react';
import { InvitationCardSettings, TextZone } from '@/hooks/useInvitationCardSettings';
import { InteractiveTextOverlay } from '@/components/ui/InteractiveTextOverlay';

interface InvitationCardPreviewProps {
  settings: InvitationCardSettings | null;
  eventData: Record<string, string>;
  selectedZoneId?: string | null;
  onSelectZone?: (id: string | null) => void;
  onZoneUpdate?: (zoneId: string, updates: Partial<TextZone>) => void;
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
  selectedZoneId = null,
  onSelectZone,
  onZoneUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleMove = useCallback((zoneId: string, dxPercent: number, dyPercent: number) => {
    const zone = textZones.find(z => z.id === zoneId);
    if (!zone || !onZoneUpdate) return;
    onZoneUpdate(zoneId, {
      x_percent: Math.max(0, Math.min(100, zone.x_percent + dxPercent)),
      y_percent: Math.max(0, Math.min(100, zone.y_percent + dyPercent)),
    });
  }, [textZones, onZoneUpdate]);

  const handleResize = useCallback((zoneId: string, delta: number, side: 'left' | 'right' | 'top' | 'bottom') => {
    const zone = textZones.find(z => z.id === zoneId);
    if (!zone || !onZoneUpdate) return;
    const updates: Partial<TextZone> = {};
    if (side === 'left' || side === 'right') {
      const newWidth = Math.max(10, Math.min(100, zone.width_percent + (side === 'right' ? delta : -delta)));
      updates.width_percent = newWidth;
      if (side === 'left') {
        updates.x_percent = Math.max(0, Math.min(100, zone.x_percent + delta / 2));
      }
    } else {
      // top/bottom: reposition vertically
      updates.y_percent = Math.max(0, Math.min(100, zone.y_percent + delta));
    }
    onZoneUpdate(zoneId, updates);
  }, [textZones, onZoneUpdate]);

  const handleCornerResize = useCallback((zoneId: string, dxP: number, dyP: number, corner: string) => {
    const zone = textZones.find(z => z.id === zoneId);
    if (!zone || !onZoneUpdate) return;
    const updates: Partial<TextZone> = {};

    // Horizontal: tl/bl shrink width, tr/br grow width
    const isLeft = corner === 'tl' || corner === 'bl';
    const dw = isLeft ? -dxP : dxP;
    updates.width_percent = Math.max(10, Math.min(100, zone.width_percent + dw));
    if (isLeft) {
      updates.x_percent = Math.max(0, Math.min(100, zone.x_percent + dxP / 2));
    }

    // Vertical: top corners move y, bottom corners also move y
    const isTop = corner === 'tl' || corner === 'tr';
    if (isTop) {
      updates.y_percent = Math.max(0, Math.min(100, zone.y_percent + dyP));
    } else {
      // Bottom corners: don't move y (text zones auto-height)
    }

    onZoneUpdate(zoneId, updates);
  }, [textZones, onZoneUpdate]);

  const handleRotate = useCallback((zoneId: string, degrees: number) => {
    if (!onZoneUpdate) return;
    onZoneUpdate(zoneId, { rotation: degrees });
  }, [onZoneUpdate]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <div className="flex justify-center">
          <div
            ref={containerRef}
            style={{
              width: previewWidth,
              height: previewHeight,
              backgroundColor: currentSettings.background_color,
              maxWidth: '100%',
            }}
            className="bg-white shadow-lg overflow-visible relative"
            onClick={() => onSelectZone?.(null)}
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

              const isSelected = selectedZoneId === zone.id;
              const isInteractive = !!onZoneUpdate;

              if (isInteractive) {
                return (
                  <InteractiveTextOverlay
                    key={zone.id}
                    isSelected={isSelected}
                    onSelect={() => onSelectZone?.(zone.id)}
                    onMove={(dx, dy) => handleMove(zone.id, dx, dy)}
                    onResize={(dw, side) => handleResize(zone.id, dw, side)}
                    onCornerResize={(dw, dy, corner) => handleCornerResize(zone.id, dw, dy, corner)}
                    onRotate={(deg) => handleRotate(zone.id, deg)}
                    containerRef={containerRef as React.RefObject<HTMLElement>}
                    showResizeHandles={true}
                    showRotateHandle={true}
                    rotation={zone.rotation || 0}
                    style={{
                      left: `${zone.x_percent - zone.width_percent / 2}%`,
                      top: `${zone.y_percent}%`,
                      width: `${zone.width_percent}%`,
                      transform: `translateY(-50%) rotate(${zone.rotation || 0}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <div
                      style={{
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
                  </InteractiveTextOverlay>
                );
              }

              return (
                <div
                  key={zone.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${zone.x_percent - zone.width_percent / 2}%`,
                    top: `${zone.y_percent}%`,
                    width: `${zone.width_percent}%`,
                    transform: `translateY(-50%) rotate(${zone.rotation || 0}deg)`,
                    transformOrigin: 'center center',
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
      </div>
    </div>
  );
};
