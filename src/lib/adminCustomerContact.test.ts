import {describe,it,expect} from 'vitest';
import {customerCountryLabel,customerMobileLabel} from './adminCustomerContact';
describe('recorded customer contact presentation',()=>{
 it('formats explicit international numbers without inventing account country',()=>{
  expect(customerMobileLabel('+61412345678').text).toBe('+61 412 345 678');
  expect(customerCountryLabel(null)).toBe('Not available');
 });
 it('uses a recorded calling country for national numbers',()=>{
  expect(customerMobileLabel('0412345678','AU')).toEqual({text:'+61 412 345 678',ambiguous:false});
  expect(customerCountryLabel('au')).toBe('Australia');
 });
 it('preserves ambiguous and invalid input without guessing',()=>{
  expect(customerMobileLabel('0412345678')).toEqual({text:'0412345678',ambiguous:true});
  expect(customerMobileLabel('unknown','AU').text).toBe('unknown');
  expect(customerCountryLabel('invalid')).toBe('Not available');
  expect(customerMobileLabel(null).text).toBe('Not provided');
 });
});
