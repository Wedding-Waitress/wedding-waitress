import {it,expect,vi} from 'vitest';
import {notifyTrialInterest} from '../../supabase/functions/venue-floor-plan-request/trialNotification';
const details={'Venue name':'Test Venue','Venue email':'venue@example.com','Phone':'123','Room':'Room A'};
it('sends support the venue details with venue reply-to',async()=>{const send=vi.fn().mockResolvedValue({ok:true});await notifyTrialInterest('test-key','request-1',details,send);const payload=JSON.parse(send.mock.calls[0][1].body);expect(payload.to).toEqual(['support@weddingwaitress.com.au']);expect(payload.reply_to).toBe('venue@example.com');expect(payload.text).toContain('Phone: 123');expect(payload.text).toContain('promo code');});
it('reports delivery failures for retry',async()=>{await expect(notifyTrialInterest('key','id',details,vi.fn().mockResolvedValue({ok:false}))).rejects.toThrow('Please retry');});
