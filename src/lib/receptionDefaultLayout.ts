import type {Fixture,ReceptionFloorPlan,TablePosition} from '@/hooks/useReceptionFloorPlan';
import type {ReceptionTable} from '@/hooks/useReceptionTables';
export const RECEPTION_DEFAULT_ROOM = {width:20,length:35,grid:50} as const;
export const RECEPTION_DEFAULT_ROW_SPACING = 3.5;
// Owner-approved arrangement, 6 September 2026. Geometry only: no event or guest data.
const fixtures = [
  {
    "type": "dance_floor",
    "x": 9.66166,
    "y": 17.321031963171155,
    "width_m": 7.37958,
    "height_m": 5.323857414989767,
    "rotation": 0
  },
  {
    "type": "cake_table",
    "x": 15.707868931050234,
    "y": 17.17553915460558,
    "width_m": 2.0599885635962814,
    "height_m": 2.0742017764446516,
    "rotation": 0
  },
  {
    "type": "door",
    "x": 9.92031337216186,
    "y": 34.62926820214139,
    "width_m": 5.170800000000001,
    "height_m": 0.48,
    "rotation": 0
  },
  {
    "type": "toilets",
    "x": 18.976479609384253,
    "y": 1.0267832274288016,
    "width_m": 2,
    "height_m": 2,
    "rotation": 0
  },
  {
    "type": "toilets",
    "x": 1.0646635957172101,
    "y": 0.9751884574399079,
    "width_m": 2,
    "height_m": 2,
    "rotation": 0
  },
  {
    "type": "kitchen",
    "x": 10.035594634671655,
    "y": 0.9676682021413958,
    "width_m": 5.004571467233495,
    "height_m": 1.8060092128483713,
    "rotation": 0
  },
  {
    "type": "window",
    "x": 19.680006202141392,
    "y": 7.726315062950703,
    "width_m": 0.512332,
    "height_m": 3.46552,
    "rotation": 0
  },
  {
    "type": "window",
    "x": 19.680006202141396,
    "y": 27.851078309211157,
    "width_m": 0.544664,
    "height_m": 3.5301799999999997,
    "rotation": 0
  },
  {
    "type": "bar",
    "x": 2.188299999999998,
    "y": 34.2316,
    "width_m": 4,
    "height_m": 1.226322,
    "rotation": 0
  },
  {
    "type": "dj_band",
    "x": 1.233518989293021,
    "y": 17.369529659959063,
    "width_m": 5.5700400000000005,
    "height_m": 2.14372,
    "rotation": 90
  }
] as const;
const tablePositions = [
  {
    "x": 16.642063500645577,
    "y": 10.761918006833524,
    "rotation": 0
  },
  {
    "x": 16.609731702786974,
    "y": 23.235806259549758,
    "rotation": 0
  },
  {
    "x": 13.142063500645575,
    "y": 10.761918006833524,
    "rotation": 0
  },
  {
    "x": 13.174395298504184,
    "y": 23.332801653125543,
    "rotation": 0
  },
  {
    "x": 9.609721904928367,
    "y": 10.761918006833524,
    "rotation": 0
  }
] as const;
export function createReceptionDefaultFixtures(width=20,length=35):Fixture[] {
 return fixtures.map(f=>({...f,id:crypto.randomUUID(),x:f.x*width/20,y:f.y*length/35,locked:false}));
}
export function defaultReceptionTablePosition(table:ReceptionTable,plan:ReceptionFloorPlan,fallbackNumber=1):TablePosition {
 if(table.table_purpose==='head') return {table_id:table.id,x:18.015023819272557*plan.room_width_m/20,y:17.03004606424186*plan.room_length_m/35,rotation:270,locked:false,width_m:7.054563595717209,height_m:1.875962787151629};
 const number=table.table_no && table.table_no>0 ? Math.floor(table.table_no) : fallbackNumber;
 const approved=tablePositions[number-1];
 if(approved) return {table_id:table.id,...approved,x:approved.x*plan.room_width_m/20,y:approved.y*plan.room_length_m/35,locked:false};
 const row=Math.floor((number-1)/2);
 const firstRow=20-tablePositions[0].x;
 const rowsPerColumn=Math.max(1,Math.floor((plan.room_width_m-firstRow-1.8)/RECEPTION_DEFAULT_ROW_SPACING)+1);
 const column=Math.floor(row/rowsPerColumn);
 const top=firstRow+(row%rowsPerColumn)*RECEPTION_DEFAULT_ROW_SPACING;
 const inset=column*RECEPTION_DEFAULT_ROW_SPACING;
 const left=number%2===1 ? Math.max(1,tablePositions[0].y*plan.room_length_m/35-inset) : Math.min(plan.room_length_m-1,tablePositions[1].y*plan.room_length_m/35+inset);
 return {table_id:table.id,x:Math.max(.5,plan.room_width_m-top),y:Math.max(.5,Math.min(plan.room_length_m-.5,left)),rotation:0,locked:false};
}
