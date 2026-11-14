import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { IndividualTableChartCustomizer } from './IndividualTableChartCustomizer';
import type { IndividualChartSettings } from './IndividualTableSeatingChartPage';
const defaults={tableShape:'round',fontSize:'medium',includeNames:true,includeDietary:true,includeRelation:true,includeGuestList:true,showSeatNumbers:true,isBold:false,isItalic:false,isUnderline:false,largerTableNames:false,guestTextSize:'standard',guestNameColor:'#000000',seatNumberColor:'#000000',guestListColor:'#000000',dietaryColor:'#000000',relationshipColor:'#000000',paperSize:'A4',title:'',showLogo:true,enableEndSeats:false,endSeatsCount:1} as IndividualChartSettings;
it.each([
 ['guest names','Show Guest Names','guestNameColor','includeNames'],
 ['seat numbers','Show Seat Numbers','seatNumberColor','showSeatNumbers'],
 ['guest list','Show Guest List','guestListColor','includeGuestList'],
 ['dietary requirements','Show Dietary Requirements','dietaryColor','includeDietary'],
 ['relationships','Show Relationship','relationshipColor','includeRelation'],
])('preserves %s palette order, selected state and toggle behaviour in an isolated fixture',(name,label,colorKey,toggleKey)=>{
 const changes=vi.fn();function Fixture(){const[s,set]=React.useState(defaults);return <IndividualTableChartCustomizer settings={s} onSettingsChange={patch=>{changes(patch);set(v=>({...v,...patch}));}}/>;}
 render(<Fixture/>);const group=screen.getByRole('group',{name:`${name} colour`});
 const colors=['black','red','blue','green','Wedding Waitress gold','purple','orange'];
 expect(within(group).getAllByRole('button').map(b=>b.getAttribute('aria-label'))).toEqual(colors.map(c=>`Use ${c} for ${name}`));
 fireEvent.click(within(group).getByRole('button',{name:`Use red for ${name}`}));expect(changes).toHaveBeenLastCalledWith({[colorKey]:'#C62828'});
 expect(within(group).getByRole('button',{name:`Use red for ${name}`})).toHaveAttribute('aria-pressed','true');
 const toggle=screen.getByRole('switch',{name:label});expect(toggle).toHaveAttribute('aria-checked','true');fireEvent.click(toggle);
 expect(changes).toHaveBeenLastCalledWith({[toggleKey]:false});expect(toggle).toHaveAttribute('aria-checked','false');
});
