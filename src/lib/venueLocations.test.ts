import {describe,it,expect} from 'vitest';
import {venueRegions,matchesVenueLocation} from './venueLocations';
describe('venue location search',()=>{
 it('lists only the 20 Italian regions',()=>{const regions=venueRegions('Italy');expect(regions).toHaveLength(20);expect(regions).toContain('Tuscany');expect(regions).not.toContain('Province of Florence');expect(regions).not.toContain('Metropolitan City of Rome');});
 it('provides country-specific regions',()=>{expect(venueRegions('Australia')).toContain('New South Wales');expect(venueRegions('Canada')).toContain('Ontario');expect(venueRegions('Canada')).not.toContain('New South Wales');});
 it('matches venue names without matching room or city text',()=>{expect(matchesVenueLocation({venue_name:'Garden House',country:'Australia',state_region:'Victoria'},'Australia','Victoria','garden')).toBe(true);expect(matchesVenueLocation({venue_name:'Garden House',country:'Australia',state_region:'Victoria'},'Australia','Queensland','garden')).toBe(false);});
 it('keeps every room template for a matching venue',()=>{const rooms=['Ballroom','Terrace','Hall'].map(room=>({venue_name:'Garden House',room_name:room,country:'Australia',state_region:'Victoria'}));expect(rooms.filter(t=>matchesVenueLocation(t,'Australia','Victoria','garden'))).toHaveLength(3);});
});
