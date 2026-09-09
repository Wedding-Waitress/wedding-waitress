import {expect,it} from 'vitest';
import {paginateReceptionNotes} from '@/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanA4';
import type {ReceptionFloorPlan} from '@/hooks/useReceptionFloorPlan';
it('keeps all 4000 characters without clipped lines',()=>{const note='X'.repeat(4000);const pages=paginateReceptionNotes({vendor_notes:note,table_positions:[]} as ReceptionFloorPlan);expect(pages.length).toBe(2);expect(pages.flat().join('').replace('Vendor setup notes','')).toBe(note);expect(pages.every(p=>p.length<=38)).toBe(true)});
it('includes table notes and preserves blank lines',()=>{const pages=paginateReceptionNotes({vendor_notes:'',table_positions:[{table_name:'Family',note:'Access aisle\nKeep clear'}]} as ReceptionFloorPlan);expect(pages.flat().join('\n')).toContain('Family:\n\nAccess aisle\nKeep clear')});
it('adds no blank notes sheet',()=>expect(paginateReceptionNotes({vendor_notes:' ',table_positions:[]} as ReceptionFloorPlan)).toEqual([]));
