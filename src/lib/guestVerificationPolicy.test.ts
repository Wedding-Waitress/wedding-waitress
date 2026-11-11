import { describe, expect, it } from 'vitest';
import { canRequestGuestCode, challengeCanBeChecked, guestAppPhase, guestSessionAllows, recordedMobileE164, isVerificationCode, GUEST_VERIFICATION_LIMITS } from '../../supabase/functions/_shared/guest-verification-policy';

describe('event-local guest application cutoff', () => {
  it('switches at the start of day seven, inclusive', () => {
    expect(guestAppPhase('2027-03-19','Australia/Sydney',new Date('2027-03-11T12:59:59.999Z'))).toBe('invitation');
    expect(guestAppPhase('2027-03-19','Australia/Sydney',new Date('2027-03-11T13:00:00Z'))).toBe('seating');
    expect(guestAppPhase('2027-03-19','Australia/Sydney',new Date('2027-03-15T01:00:00Z'))).toBe('seating');
  });
  it('remains seating-only from the cutoff onward, including after the event', () => {
    expect(guestAppPhase('2027-03-19','Australia/Sydney',new Date('2027-03-21T00:00:00Z'))).toBe('seating');
  });
  it('uses calendar days across a daylight-saving change', () => {
    expect(guestAppPhase('2027-10-10','Australia/Sydney',new Date('2027-10-02T13:59:59.999Z'))).toBe('invitation');
    expect(guestAppPhase('2027-10-10','Australia/Sydney',new Date('2027-10-02T14:00:00Z'))).toBe('seating');
  });
  it('uses the event zone rather than an implicit browser zone', () => {
    const now=new Date('2027-03-11T13:00:00Z');
    expect(guestAppPhase('2027-03-19','Australia/Sydney',now)).toBe('seating');
    expect(guestAppPhase('2027-03-19','America/Los_Angeles',now)).toBe('invitation');
  });
  it.each([['2027-02-31','Australia/Sydney'],['bad','Australia/Sydney'],['2027-03-19',''],['2027-03-19','not/a_zone']])('fails closed for unavailable/invalid clock metadata: %s %s',(date,zone)=>{
    expect(()=>guestAppPhase(date,zone,new Date('2027-01-01'))).toThrow();
  });
});

describe('recorded destination and input validation',()=>{
  it.each(['0400 000 001','(0400) 000-001','61400000001','+61 400 000 001'])('normalises a recorded Australian mobile: %s',phone=>expect(recordedMobileE164(phone)).toBe('+61400000001'));
  it('preserves explicit international country codes without guessing a country',()=>expect(recordedMobileE164('+44 7700 900001')).toBe('+447700900001'));
  it.each([null,undefined,'','0400000001 ext 5','400000001','+001234567890','+61\u202e400000001','x'.repeat(81)])('rejects missing or unsafe destinations',phone=>expect(recordedMobileE164(phone)).toBeNull());
  it('accepts six ASCII code digits including leading zero and rejects partial/malformed codes',()=>{
    expect(isVerificationCode('000123')).toBe(true);
    for(const code of['12345','1234567','12 3456','１２３４５６',123456])expect(isVerificationCode(code)).toBe(false);
  });
});

describe('bounded verified family session',()=>{
  const now=new Date('2027-03-11T12:30:00Z'),fingerprint='a'.repeat(64),anchor={id:'anchor',eventId:'event',familyGroup:'Family'};
  const base=()=>({session:{guestId:'anchor',eventId:'event',familyGroup:'Family',phoneFingerprint:fingerprint,createdAt:now.valueOf()-60_000,expiresAt:now.valueOf()+60_000,revokedAt:null},anchor,target:{id:'member',eventId:'event',familyGroup:'Family'},currentRecordedPhoneFingerprint:fingerprint,eventDate:'2027-03-19',eventTimezone:'Australia/Sydney',now});
  it('permits only the existing verified party',()=>{expect(guestSessionAllows(base())).toBe(true);expect(guestSessionAllows({...base(),target:{id:'outsider',eventId:'event',familyGroup:'Other'}})).toBe(false);expect(guestSessionAllows({...base(),target:{id:'member',eventId:'other-event',familyGroup:'Family'}})).toBe(false);});
  it('rejects a session when the recorded phone or household changes',()=>{expect(guestSessionAllows({...base(),currentRecordedPhoneFingerprint:'b'.repeat(64)})).toBe(false);expect(guestSessionAllows({...base(),anchor:{...anchor,familyGroup:'New family'}})).toBe(false);});
  it('rejects revoked, expired, future-dated and overlong sessions',()=>{
    const b=base();for(const change of[{revokedAt:1},{expiresAt:now.valueOf()},{createdAt:now.valueOf()+1},{expiresAt:b.session.createdAt+GUEST_VERIFICATION_LIMITS.sessionLifetimeMs+1}])expect(guestSessionAllows({...b,session:{...b.session,...change}})).toBe(false);
  });
  it('revokes access at the cutoff even when the session has not expired',()=>expect(guestSessionAllows({...base(),now:new Date('2027-03-11T13:00:00Z'),session:{...base().session,expiresAt:new Date('2027-03-11T14:00:00Z').valueOf()}})).toBe(false));
  it('does not treat blank family groups as a shared household',()=>expect(guestSessionAllows({...base(),session:{...base().session,familyGroup:''},anchor:{...anchor,familyGroup:''},target:{id:'other',eventId:'event',familyGroup:''}})).toBe(false));
  it('permits the verified individual without requiring a family',()=>expect(guestSessionAllows({...base(),session:{...base().session,familyGroup:null},anchor:{...anchor,familyGroup:null},target:{...anchor,familyGroup:null}})).toBe(true));
});

describe('abuse and challenge boundaries',()=>{
  const base=()=>({phase:'invitation' as const,recordedMobile:'+61400000001',now:100_000,lastRequestAt:null,guestRequestsInHour:0,ipRequestsInHour:0,eventRequestsInHour:0});
  it('does not request a code during seating mode or for a missing recorded destination',()=>{expect(canRequestGuestCode({...base(),phase:'seating'})).toBe(false);expect(canRequestGuestCode({...base(),recordedMobile:null})).toBe(false);});
  it('applies resend, guest, IP and event limits',()=>{expect(canRequestGuestCode(base())).toBe(true);for(const change of[{lastRequestAt:99_999},{guestRequestsInHour:5},{ipRequestsInHour:30},{eventRequestsInHour:300}])expect(canRequestGuestCode({...base(),...change})).toBe(false);});
  it('expires codes, caps attempts and prevents consumed-code reuse',()=>{expect(challengeCanBeChecked(1000,301000,0,false,2000)).toBe(true);expect(challengeCanBeChecked(1000,301000,0,false,301000)).toBe(false);expect(challengeCanBeChecked(1000,301000,5,false,2000)).toBe(false);expect(challengeCanBeChecked(1000,301000,0,true,2000)).toBe(false);expect(challengeCanBeChecked(1000,301001,0,false,2000)).toBe(false);});
});
