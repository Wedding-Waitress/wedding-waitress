import {describe,expect,it} from 'vitest';
import {INVITATION_CARD_SIZES,resolveInvitationCardSize,ALLOWED_INVITATION_SIZES} from './invitationCardSizes';
describe('approved invitation and thank-you sizes',()=>{
 it('uses the selected Australian ISO paper dimensions',()=>{expect(INVITATION_CARD_SIZES).toEqual({A4:{w:210,h:297},A5:{w:148,h:210},A6:{w:105,h:148}})});
 it.each(['invitation','save_the_date'] as const)('allows A4 and A5 for %s and defaults to A5',type=>{expect(ALLOWED_INVITATION_SIZES[type]).toEqual(['A4','A5']);expect(resolveInvitationCardSize(type,'A4')).toBe('A4');expect(resolveInvitationCardSize(type)).toBe('A5');expect(resolveInvitationCardSize(type,'A6')).toBe('A5')});
 it('uses only A6 for new thank-you cards',()=>{for(const size of [undefined,'A4','A5','A6','DL'])expect(resolveInvitationCardSize('thank_you',size)).toBe('A6')});
});
