import {describe,it,expect} from 'vitest';
import customerCountry from '../../netlify/edge-functions/customer-country';
describe('country-only detection',()=>{
 it('returns country without precise or identifying geolocation',async()=>{
  const response=customerCountry(new Request('https://example.test/api/customer-country'),{geo:{country:{code:'au'}}});
  expect(await response.json()).toEqual({country_code:'AU',source:'netlify-country'});
  expect(response.headers.get('cache-control')).toContain('no-store');
 });
 it('leaves unavailable country unknown',async()=>{
  for(const code of [undefined,'XX','invalid'])expect((await customerCountry(new Request('https://example.test'),{geo:{country:{code}}}).json()).country_code).toBeNull();
 });
});
