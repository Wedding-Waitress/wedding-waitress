import { describe, it, expect } from 'vitest';
import { validatePrelaunchRegistration } from '../../supabase/functions/_shared/prelaunchRegistration';
const input = { first_name: ' Alex ', last_name: 'Taylor', email: 'Alex@Example.com', mobile: '0412 345 678', promo_code: ' VENUE50 ', intended_plan: 'premium' };
describe('prelaunch input boundary', () => {
  it('normalizes contact and preserves untrusted campaign intent only', () => {
    expect(validatePrelaunchRegistration({...input, admin:true, trial:true, percent_off:100})).toEqual({first_name:'Alex',last_name:'Taylor',email:'alex@example.com',mobile:'0412345678',promo_code:'VENUE50',intended_plan:'premium'});
  });
  it.each(['first_name','last_name','email','mobile'])('requires %s', key => expect(() => validatePrelaunchRegistration({...input,[key]:''})).toThrow());
  it.each([{email:'invalid'},{mobile:'123'},{intended_plan:'vendor_pro'},{promo_code:'X'.repeat(65)},{first_name:'X'.repeat(101)},{last_name:'x\u0000y'},{email:{admin:true}}])('rejects malformed input %j', patch => expect(() => validatePrelaunchRegistration({...input,...patch})).toThrow());
  it('accepts optional promo and plan without treating either as access proof', () => {
    expect(validatePrelaunchRegistration({...input,promo_code:undefined,intended_plan:undefined})).toMatchObject({promo_code:'',intended_plan:null});
    expect(validatePrelaunchRegistration(validatePrelaunchRegistration({...input,intended_plan:undefined}))).toMatchObject({intended_plan:null});
  });
});
