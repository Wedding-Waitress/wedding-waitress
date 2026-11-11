import {describe,it,expect} from 'vitest';
import {buildPhotoCalloutUrl} from './photoCalloutShareUrl';
describe('Photo card share addresses',()=>{
 it('uses the event name and date without repeating the brand or document name',()=>{expect(buildPhotoCalloutUrl('secure-token',"Hossam & Reema’s Wedding",'2027-03-19')).toBe(`${window.location.origin}/shared-photo-callout-cards/hossam-and-reemas-wedding-19-03-2027/secure-token`);});
 it('encodes the access token as a single path segment',()=>{expect(buildPhotoCalloutUrl('token/with+unsafe=','Wedding')).toContain('/token%2Fwith%2Bunsafe%3D');});
 it('handles empty and international event names',()=>{expect(buildPhotoCalloutUrl('token','   ')).toContain('/wedding/');expect(decodeURIComponent(buildPhotoCalloutUrl('token','عرس أحمد'))).toContain('عرس-أحمد');});
});
