import {expect,it} from 'vitest';
import {SIGNAGE_PRINT_DIMENSIONS,signageEventDataFromEvent} from './signageDocumentData';
it('preserves the existing saved Signage event wording and calendar interpretation',()=>{
 expect(signageEventDataFromEvent({name:'Actual wedding',date:'2027-09-05',venue:'Saved venue',start_time:'16:00',partner1_name:'Élodie',partner2_name:'O’Connor'}))
  .toEqual({couple_names:'Élodie & O’Connor',event_name:'Actual wedding',date:new Date(2027,8,5).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),date_raw:'2027-09-05',venue:'Saved venue',time:'4:00 PM',
   welcome_message:'Please scan the QR code to find your table.',qr_instructions:'Scan to find your seat'});
 expect(signageEventDataFromEvent(null)).toEqual({});
 expect(signageEventDataFromEvent({name:'Actual corporate event',partner1_name:'',partner2_name:''}).couple_names).toBe('Actual corporate event');
});
it('preserves the four professional Signage paper dimensions',()=>{
 expect(SIGNAGE_PRINT_DIMENSIONS).toEqual({a0:{widthMm:841,heightMm:1189},a1:{widthMm:594,heightMm:841},a2:{widthMm:420,heightMm:594},a3:{widthMm:297,heightMm:420}});
});
