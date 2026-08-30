/**
 * ⚠️ WARNING: PRODUCTION LOCKED - DO NOT MODIFY ⚠️
 * Explicitly reorganised with owner approval; renderer geometry remains protected.
 */

import { useRef, useState, type KeyboardEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlignLeft, AlignRight, Armchair, ArrowLeftRight, Check, ChevronDown, Columns3,
  Eye, Heart, HeartHandshake, Rows3, SlidersHorizontal, Tags, UserRound, UsersRound,
} from 'lucide-react';
import { CeremonyFloorPlan } from '@/hooks/useCeremonyFloorPlan';
import styles from './CeremonyFloorPlanSettings.module.css';

interface CeremonyFloorPlanSettingsProps {
  floorPlan: CeremonyFloorPlan;
  totalAttending: number;
  onUpdate: (updates: Partial<CeremonyFloorPlan>) => Promise<boolean>;
}

const sections = [
  { id: 'arrangement', title: 'Couple Arrangement', icon: HeartHandshake },
  { id: 'names', title: 'Couple Names', icon: Heart },
  { id: 'bridal-party', title: 'Bridal Party', icon: UsersRound },
  { id: 'family-labels', title: 'Family Labels', icon: Tags },
  { id: 'display', title: 'Display Options', icon: Eye },
  { id: 'capacity', title: 'Rows & Capacity', icon: Rows3 },
] as const;

type SectionId = (typeof sections)[number]['id'];
const chairsPerRowOptions = Array.from({ length: 6 }, (_, index) => index + 1);
const totalRowOptions = Array.from({ length: 12 }, (_, index) => index + 1);

export const CeremonyFloorPlanSettings = ({ floorPlan, totalAttending, onUpdate }: CeremonyFloorPlanSettingsProps) => {
  const [activeSection, setActiveSection] = useState<SectionId>('arrangement');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleChange = (key: keyof CeremonyFloorPlan, value: number | string | boolean) => {
    if (key === 'couple_side_arrangement' && value !== floorPlan.couple_side_arrangement) {
      void onUpdate({
        couple_side_arrangement: value as 'groom_left' | 'bride_left',
        person_left_name: floorPlan.person_right_name,
        person_right_name: floorPlan.person_left_name,
      });
      return;
    }
    void onUpdate({ [key]: value });
  };

  const handleTotalRowsChange = (value: string) => {
    const totalRows = Math.min(12, Math.max(1, Number(value)));
    void onUpdate({
      total_rows: totalRows,
      ...(floorPlan.assigned_rows > totalRows ? { assigned_rows: totalRows } : {}),
    });
  };

  const isGroomLeft = floorPlan.couple_side_arrangement === 'groom_left';
  const groomsmenCount = Math.min(10, isGroomLeft ? floorPlan.bridal_party_count_left : floorPlan.bridal_party_count_right);
  const bridesmaidsCount = Math.min(10, isGroomLeft ? floorPlan.bridal_party_count_right : floorPlan.bridal_party_count_left);
  const displaySummary = floorPlan.show_row_numbers
    ? floorPlan.show_seat_numbers ? 'Rows and seats shown' : 'Rows shown · Seats hidden'
    : floorPlan.show_seat_numbers ? 'Rows hidden · Seats shown' : 'Rows and seats hidden';
  const summaries: Record<SectionId, string> = {
    arrangement: isGroomLeft ? 'Groom left · Bride right' : 'Bride left · Groom right',
    names: `${floorPlan.person_left_name || 'Left name'} · ${floorPlan.person_right_name || 'Right name'}`,
    'bridal-party': `${groomsmenCount} groomsmen · ${bridesmaidsCount} bridesmaids`,
    'family-labels': `${floorPlan.left_side_label} · ${floorPlan.right_side_label}`,
    display: displaySummary,
    capacity: `${floorPlan.total_rows} rows · ${floorPlan.chairs_per_row} chairs each side · ${floorPlan.assigned_rows} family rows`,
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % sections.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + sections.length) % sections.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = sections.length - 1;
    else return;
    event.preventDefault();
    setActiveSection(sections[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <Card className={`${styles.settingsPanel} border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]`} data-ceremony-layout-settings="true">
      <CardHeader className={styles.settingsHeader}>
        <CardTitle className={`${styles.majorHeading} text-2xl font-bold text-foreground flex items-center gap-2`}>
          <SlidersHorizontal className="w-[22px] h-[22px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          Layout Settings
        </CardTitle>
        <p className={styles.totalAttending} role="status" aria-live="polite" aria-atomic="true">
          <span className={styles.totalLabel}>
            <UsersRound aria-hidden="true" />
            Total Attending: <strong>{totalAttending}</strong>
          </span>
          {' '}
          <span className={styles.totalContext}>(Bride &amp; Groom + Celebrant + Bridal Party + Family &amp; Friends)</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={styles.selectorGrid} role="tablist" aria-label="Ceremony layout setting sections">
          {sections.map(({ id, title, icon: Icon }, index) => {
            const selected = activeSection === id;
            return (
              <button
                key={id}
                ref={(node) => { tabRefs.current[index] = node; }}
                type="button"
                role="tab"
                id={`ceremony-settings-tab-${id}`}
                aria-selected={selected}
                aria-controls={`ceremony-settings-panel-${id}`}
                tabIndex={selected ? 0 : -1}
                className={styles.selector}
                data-active={selected}
                onClick={() => setActiveSection(id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <span className={styles.selectorHeading}>
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span>{title}</span>
                  {selected ? <Check className={styles.indicator} strokeWidth={2} aria-hidden="true" /> : <ChevronDown className={styles.indicator} strokeWidth={1.8} aria-hidden="true" />}
                </span>
                <span className={styles.summary}>{summaries[id]}</span>
                <span className="sr-only">{selected ? 'Selected' : 'Select to edit'}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.detailShell}>
          <section id="ceremony-settings-panel-arrangement" role="tabpanel" aria-labelledby="ceremony-settings-tab-arrangement" hidden={activeSection !== 'arrangement'} className={styles.detailPanel}>
            <div className={styles.arrangementControls}>
              <Label className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><ArrowLeftRight className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Which side is the Groom on?</Label>
              <Select value={floorPlan.couple_side_arrangement} onValueChange={(value) => handleChange('couple_side_arrangement', value)}>
                <SelectTrigger aria-label="Which side is the Groom on?"><SelectValue /></SelectTrigger>
                <SelectContent className={styles.portalSurface}><SelectItem className={styles.portalItem} value="groom_left">Groom on Left, Bride on Right</SelectItem><SelectItem className={styles.portalItem} value="bride_left">Bride on Left, Groom on Right</SelectItem></SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">This affects where groomsmen/bridesmaids stand</p>
            </div>
          </section>

          <section id="ceremony-settings-panel-names" role="tabpanel" aria-labelledby="ceremony-settings-tab-names" hidden={activeSection !== 'names'} className={styles.detailPanel}>
            <p className={styles.compactNote}>These names appear beside the celebrant at the altar</p>
            <div className={styles.twoColumnControls}>
              <div className={styles.controlGroup}>
                <Label htmlFor="ceremony-person-left" className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><UserRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />{isGroomLeft ? 'Left (Groom)' : 'Left (Bride)'}</Label>
                <Input id="ceremony-person-left" value={floorPlan.person_left_name} onChange={(event) => handleChange('person_left_name', event.target.value)} placeholder={isGroomLeft ? 'e.g., John or Groom' : 'e.g., Jane or Bride'} className="text-sm" />
              </div>
              <div className={styles.controlGroup}>
                <Label htmlFor="ceremony-person-right" className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><UserRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />{isGroomLeft ? 'Right (Bride)' : 'Right (Groom)'}</Label>
                <Input id="ceremony-person-right" value={floorPlan.person_right_name} onChange={(event) => handleChange('person_right_name', event.target.value)} placeholder={isGroomLeft ? 'e.g., Jane or Bride' : 'e.g., John or Groom'} className="text-sm" />
              </div>
            </div>
          </section>

          <section id="ceremony-settings-panel-bridal-party" role="tabpanel" aria-labelledby="ceremony-settings-tab-bridal-party" hidden={activeSection !== 'bridal-party'} className={styles.detailPanel}>
            <div className={styles.twoColumnControls}>
              <div className={styles.sliderGroup}>
                <div className="flex items-center justify-between"><Label className="text-sm inline-flex items-center gap-1.5"><UserRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />{isGroomLeft ? 'Groomsmen' : 'Bridesmaids'} Count (Left)</Label><span className="text-sm font-medium text-primary">{Math.min(10, floorPlan.bridal_party_count_left)}</span></div>
                <Slider aria-label="Left bridal party count" value={[Math.min(10, floorPlan.bridal_party_count_left)]} onValueChange={([value]) => handleChange('bridal_party_count_left', Math.min(10, value))} min={0} max={10} step={1} className="w-full floor-plan-smooth-slider" />
                <p className="text-xs text-muted-foreground">Left side of altar (0-10)</p>
              </div>
              <div className={styles.sliderGroup}>
                <div className="flex items-center justify-between"><Label className="text-sm inline-flex items-center gap-1.5"><UserRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />{isGroomLeft ? 'Bridesmaids' : 'Groomsmen'} Count (Right)</Label><span className="text-sm font-medium text-primary">{Math.min(10, floorPlan.bridal_party_count_right)}</span></div>
                <Slider aria-label="Right bridal party count" value={[Math.min(10, floorPlan.bridal_party_count_right)]} onValueChange={([value]) => handleChange('bridal_party_count_right', Math.min(10, value))} min={0} max={10} step={1} className="w-full floor-plan-smooth-slider" />
                <p className="text-xs text-muted-foreground">Right side of altar (0-10)</p>
              </div>
            </div>
          </section>

          <section id="ceremony-settings-panel-family-labels" role="tabpanel" aria-labelledby="ceremony-settings-tab-family-labels" hidden={activeSection !== 'family-labels'} className={styles.detailPanel}>
            <div className={styles.twoColumnControls}>
              <div className={styles.controlGroup}><Label htmlFor="ceremony-family-left" className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><AlignLeft className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Left Side</Label><Input id="ceremony-family-left" value={floorPlan.left_side_label} onChange={(event) => handleChange('left_side_label', event.target.value)} placeholder="e.g., Groom's Family" className="text-sm" /></div>
              <div className={styles.controlGroup}><Label htmlFor="ceremony-family-right" className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><AlignRight className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Right Side</Label><Input id="ceremony-family-right" value={floorPlan.right_side_label} onChange={(event) => handleChange('right_side_label', event.target.value)} placeholder="e.g., Bride's Family" className="text-sm" /></div>
            </div>
          </section>

          <section id="ceremony-settings-panel-display" role="tabpanel" aria-labelledby="ceremony-settings-tab-display" hidden={activeSection !== 'display'} className={styles.detailPanel}>
            <div className={styles.twoColumnControls}>
              <div className={styles.switchControl}><Label htmlFor="ceremony-show-rows" className="text-sm inline-flex items-center gap-1.5"><Rows3 className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Show Row Numbers</Label><Switch id="ceremony-show-rows" className="data-[state=unchecked]:border data-[state=unchecked]:border-[#7C5C3E]" checked={floorPlan.show_row_numbers} onCheckedChange={(checked) => handleChange('show_row_numbers', checked)} /></div>
              <div className={styles.switchControl}><Label htmlFor="ceremony-show-seats" className="text-sm inline-flex items-center gap-1.5"><Armchair className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />Show Seat Numbers</Label><Switch id="ceremony-show-seats" className="data-[state=unchecked]:border data-[state=unchecked]:border-[#7C5C3E]" checked={floorPlan.show_seat_numbers} onCheckedChange={(checked) => handleChange('show_seat_numbers', checked)} /></div>
            </div>
          </section>

          <section id="ceremony-settings-panel-capacity" role="tabpanel" aria-labelledby="ceremony-settings-tab-capacity" hidden={activeSection !== 'capacity'} className={styles.detailPanel}>
            <div className={styles.threeColumnControls}>
              <div className={styles.controlGroup}>
                <Label className={styles.controlTitle}><Columns3 aria-hidden="true" />Chairs per Row</Label>
                <Select value={String(floorPlan.chairs_per_row)} onValueChange={(value) => handleChange('chairs_per_row', Number(value))}>
                  <SelectTrigger aria-label="Chairs per Row"><SelectValue /></SelectTrigger>
                  <SelectContent className={styles.portalSurface}>{chairsPerRowOptions.map(value => <SelectItem className={styles.portalItem} key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className={styles.controlGroup}>
                <Label className={styles.controlTitle}><Rows3 aria-hidden="true" />Total Rows</Label>
                <Select value={String(Math.min(12, floorPlan.total_rows))} onValueChange={handleTotalRowsChange}>
                  <SelectTrigger aria-label="Total Rows"><SelectValue /></SelectTrigger>
                  <SelectContent className={styles.portalSurface}>{totalRowOptions.map(value => <SelectItem className={styles.portalItem} key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className={styles.controlGroup}>
                <Label className={styles.controlTitle}><UsersRound aria-hidden="true" />Family Rows</Label>
                <Select value={String(Math.min(floorPlan.assigned_rows, floorPlan.total_rows, 12))} onValueChange={(value) => handleChange('assigned_rows', Math.min(Number(value), floorPlan.total_rows, 12))}>
                  <SelectTrigger aria-label="Family Rows"><SelectValue /></SelectTrigger>
                  <SelectContent className={styles.portalSurface}>{totalRowOptions.slice(0, Math.min(floorPlan.total_rows, 12)).map(value => <SelectItem className={styles.portalItem} key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
};
