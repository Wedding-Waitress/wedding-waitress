import { describe, expect, it } from 'vitest';
import { promotionAccountSearchEmail, validatePromotionAudience } from '../../supabase/functions/_shared/promotionAudienceRules';
const account='00000000-0000-4000-8000-000000000002';
describe('promotion audience request validation',()=>{
 it.each([0,1,100])('accepts explicit allocation %s without interpreting zero as unlimited',usage_limit=>{
  expect(validatePromotionAudience({audience:'general',usage_limit,bound_account_id:null})).toEqual({audience:'general',usage_limit,bound_account_id:null});
 });
 it.each([-1,101,0.5,'1',null,undefined,NaN,Infinity])('rejects invalid allocation %s',usage_limit=>expect(()=>validatePromotionAudience({audience:'general',usage_limit})).toThrow());
 it.each(['customer','venue_partner'])('requires a selected account for %s',audience=>{
  expect(()=>validatePromotionAudience({audience,usage_limit:1})).toThrow();
  expect(validatePromotionAudience({audience,usage_limit:1,bound_account_id:account}).bound_account_id).toBe(account);
 });
 it('rejects unsupported audiences and a stray General account binding',()=>{
  expect(()=>validatePromotionAudience({audience:'unknown',usage_limit:1})).toThrow();
  expect(()=>validatePromotionAudience({audience:'general',usage_limit:1,bound_account_id:account})).toThrow();
 });
 it('normalizes a complete email and rejects broad or malformed searches',()=>{
  expect(promotionAccountSearchEmail(' Account@Example.Test ')).toBe('account@example.test');
  for(const email of ['account','%','account@','x@y.z\nmore',null])expect(()=>promotionAccountSearchEmail(email)).toThrow();
 });
});
