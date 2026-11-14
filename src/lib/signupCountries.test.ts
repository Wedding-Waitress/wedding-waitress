import {describe,it,expect} from 'vitest';
import {signupCountryCodes,signupCountryOptions,signupCountryCode,resolveSignupCountry} from './signupCountries';
import {publicSignupCountryRows,publicSignupCountrySources} from '@/i18n/publicSignupCountryCopy';
import {customerCountryLabel} from './adminCustomerContact';
describe('signup country choice',()=>{
 it('offers all 249 unique ISO countries and territories and rejects arbitrary input',()=>{
  expect(signupCountryCodes).toHaveLength(249);expect(new Set(signupCountryCodes).size).toBe(249);
  expect(signupCountryCode(' au ')).toBe('AU');expect(signupCountryCode('XX')).toBeNull();expect(resolveSignupCountry('Aus')).toBeNull();expect(resolveSignupCountry('not a country')).toBeNull();
 });
 it('lets native country suggestions match Aus while persisting a stable ISO code',()=>{
  const matches=signupCountryOptions().filter(country=>country.name.toLowerCase().includes('aus'));
  expect(matches.map(country=>country.name)).toContain('Australia');expect(resolveSignupCountry('Australia')).toBe('AU');expect(resolveSignupCountry('australia')).toBe('AU');
 });
 it.each(Object.keys(publicSignupCountryRows))('localizes country names and complete field copy in %s',language=>{
  expect(publicSignupCountryRows[language]).toHaveLength(publicSignupCountrySources.length);
  for(const text of publicSignupCountryRows[language])expect(text.trim()).not.toBe('');
  const australia=signupCountryOptions(language).find(country=>country.code==='AU')!;
  expect(resolveSignupCountry(australia.name,language)).toBe('AU');expect(resolveSignupCountry('Australia',language)).toBe('AU');
 });
 it('displays selected territories even when they have no telephone numbering region',()=>{
  expect(customerCountryLabel('AQ')).toBe('Antarctica');expect(customerCountryLabel('UM')).not.toBe('Not available');
 });
});
