/**
 * Phase 2D — Public read-only share view at /share/reception/:token.
 * No edits, no toolbar, no upload. PDF export only.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, FileDown, ChevronDown, LayoutGrid, StickyNote, ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { PinchZoomContainer } from '@/components/ui/PinchZoomContainer';
import { useReceptionFloorPlanShare } from '@/hooks/useReceptionFloorPlanShare';
import {
  FIXTURE_BY_TYPE,
} from '@/components/Dashboard/FloorPlan/ReceptionFloorPlan/fixtures';
import {
  generateReceptionFloorPlanPDF,
  type ReceptionPdfPageSize,
} from '@/lib/receptionFloorPlanPdfExporter';
import { polygonToSvgPath } from '@/lib/floorPlanShapes';

const PX_PER_M = 50;

export const ReceptionFloorPlanShareView = () => {
  const { token } = useParams<{ token: string }>();
  const { data, backgroundUrl, loading, error } = useReceptionFloorPlanShare(token);
  const { toast } = useToast();
  const [exporting, setExporting] = useState<ReceptionPdfPageSize | null>(null);

  const handleExport = async (size: ReceptionPdfPageSize) => {
    if (!data) return;
    setExporting(size);
    try {
      await generateReceptionFloorPlanPDF(data.plan, data.tables, data.event, 0, size);
      toast({ title: 'Floor plan exported', description: `${size.toUpperCase()} PDF downloaded.` });
    } catch (e) {
      console.error(e);
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading shared floor plan…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Floor plan unavailable</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          {error ?? 'This share link is invalid or has been revoked.'}
        </p>
      </div>
    );
  }

  const { plan, event, tables } = data;
  const roomW = plan.room_width_m * PX_PER_M;
  const roomH = plan.room_length_m * PX_PER_M;
  const gridPx = (plan.grid_size_cm / 100) * PX_PER_M;
  const tableById = new Map(tables.map((t) => [t.id, t]));
  const bg = plan.background;
  const showBg = !!backgroundUrl && bg.visible && bg.width != null && bg.height != null;
  const polygon = plan.room_polygon;
  const polygonPath = polygon ? polygonToSvgPath(polygon, PX_PER_M) : '';

  const couple = [event.partner1_name, event.partner2_name].filter(Boolean).join(' & ');

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <LayoutGrid className="w-6 h-6 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                {event.name} · Reception Floor Plan
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {[couple, event.venue, event.date].filter(Boolean).join(' · ')}
              </p>
              <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#967A59]/40 bg-[#967A59]/10 text-[#7a6347]">
                {({ draft: 'Draft', sent_to_venue: 'Sent to Venue', approved: 'Approved by Venue', final: 'Final' } as Record<string, string>)[plan.approval_status] || 'Draft'}
              </span>
            </div>

          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="lv-premium-shade h-9 bg-[#967A59] hover:bg-[#7a6347] text-white"
                disabled={!!exporting}
              >
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 mr-1.5" />
                )}
                Export PDF
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('a4')}>A4</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('a3')}>A3</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('a2')}>A2</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-lg border border-border bg-white p-2 overflow-hidden">
          <PinchZoomContainer naturalWidth={roomW} className="w-full">
            <div className="overflow-auto">
              <div
                className="relative bg-white border-2 border-foreground/70 shadow-inner mx-auto"
                style={{
                  width: roomW,
                  height: roomH,
                  backgroundImage:
                    'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
                  backgroundSize: `${gridPx}px ${gridPx}px`,
                  clipPath: polygon ? `path('${polygonPath}')` : undefined,
                  WebkitClipPath: polygon ? `path('${polygonPath}')` : undefined,
                }}
              >
                {showBg && (
                  <img
                    src={backgroundUrl!}
                    alt="Venue background"
                    draggable={false}
                    style={{
                      position: 'absolute',
                      left: bg.x * PX_PER_M,
                      top: bg.y * PX_PER_M,
                      width: bg.width! * PX_PER_M,
                      height: bg.height! * PX_PER_M,
                      transform: `rotate(${bg.rotation}deg)`,
                      transformOrigin: 'center center',
                      opacity: bg.opacity,
                      zIndex: 0,
                      objectFit: 'contain',
                    }}
                  />
                )}
                {plan.fixtures.map((fx) => {
                  const spec = FIXTURE_BY_TYPE[fx.type];
                  if (!spec) return null;
                  const Icon = spec.icon;
                  const w = fx.width_m * PX_PER_M;
                  const h = fx.height_m * PX_PER_M;
                  const rounded = spec.shape === 'round' ? 'rounded-full' : 'rounded-md';
                  return (
                    <div
                      key={fx.id}
                      style={{
                        position: 'absolute',
                        left: fx.x * PX_PER_M,
                        top: fx.y * PX_PER_M,
                        transform: `translate(-50%, -50%) rotate(${fx.rotation}deg)`,
                        width: w,
                        height: h,
                        zIndex: 1,
                      }}
                    >
                      <div
                        className={`absolute inset-0 ${rounded} flex items-center justify-center text-[10px] font-semibold shadow-sm border border-black/10`}
                        style={{ backgroundColor: spec.color, color: spec.textColor }}
                      >
                        <div className="flex items-center gap-1 px-1 text-center leading-tight">
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{fx.label || spec.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {plan.table_positions.map((pos) => {
                  const t = tableById.get(pos.table_id);
                  if (!t) return null;
                  const diameterM = Math.max(1.2, 1.2 + Math.max(0, t.limit_seats - 6) * 0.12);
                  const diameterPx = diameterM * PX_PER_M;
                  const chairSize = 16;
                  const chairOffset = diameterPx / 2 + 10;
                  return (
                    <div
                      key={pos.table_id}
                      style={{
                        position: 'absolute',
                        left: pos.x * PX_PER_M,
                        top: pos.y * PX_PER_M,
                        transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
                        width: diameterPx,
                        height: diameterPx,
                        zIndex: 2,
                      }}
                    >
                      {Array.from({ length: t.limit_seats }).map((_, i) => {
                        const angle = (i / t.limit_seats) * 2 * Math.PI - Math.PI / 2;
                        const cx = diameterPx / 2 + Math.cos(angle) * chairOffset - chairSize / 2;
                        const cy = diameterPx / 2 + Math.sin(angle) * chairOffset - chairSize / 2;
                        return (
                          <div
                            key={i}
                            style={{
                              position: 'absolute',
                              left: cx,
                              top: cy,
                              width: chairSize,
                              height: chairSize,
                            }}
                            className="rounded-sm bg-[#967A59]/70 border border-[#7a6347]"
                          />
                        );
                      })}
                      <div
                        className="absolute inset-0 rounded-full flex items-center justify-center text-xs font-semibold text-white shadow-md"
                        style={{ backgroundColor: '#967A59' }}
                      >
                        <span className="px-1 text-center leading-tight">
                          {t.name || `T${t.table_no}`}
                        </span>
                      </div>
                      {pos.note && pos.note.trim().length > 0 && (
                        <div
                          title={pos.note}
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            transform: `rotate(${-pos.rotation}deg)`,
                            zIndex: 3,
                          }}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-amber-900 border-2 border-white shadow"
                        >
                          <StickyNote className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {polygon && (
                  <svg
                    className="pointer-events-none absolute inset-0"
                    width={roomW}
                    height={roomH}
                    style={{ zIndex: 3 }}
                  >
                    <path d={polygonPath} fill="none" stroke="#1D1D1F" strokeWidth={2} />
                  </svg>
                )}
              </div>
            </div>
          </PinchZoomContainer>
        </div>
        {(() => {
          const tableNotes = plan.table_positions
            .map((pos) => {
              const t = tables.find((tt) => tt.id === pos.table_id);
              const label = t?.name || (t ? `Table ${t.table_no}` : 'Table');
              const note = (pos.note ?? '').trim();
              return note ? { label, note } : null;
            })
            .filter((x): x is { label: string; note: string } => !!x);
          const vendorNotes = (plan.vendor_notes ?? '').trim();
          if (!tableNotes.length && !vendorNotes) return null;
          return (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {tableNotes.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <StickyNote className="w-4 h-4 text-[#967A59]" /> Table notes
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {tableNotes.map((tn) => (
                      <li key={tn.label} className="text-foreground">
                        <span className="font-medium text-[#7a6347]">{tn.label}:</span>{' '}
                        <span className="text-muted-foreground">{tn.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {vendorNotes && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <ClipboardList className="w-4 h-4 text-[#967A59]" /> Vendor setup notes
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {vendorNotes}
                  </p>
                </div>
              )}
            </div>
          );
        })()}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Shared read-only view · Wedding Waitress
        </p>
      </main>
    </div>
  );
};


export default ReceptionFloorPlanShareView;
