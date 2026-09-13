import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { PromotionActivationNotice } from './PromotionActivationNotice';
import { parsePromotionNotice } from '@/lib/promotionNotice';
const notice={reservationId:'fixture',state:'scheduled' as const,code:'VENUE100',percent:100,credits:0,startsAt:'2026-09-20T00:00:00Z',expiresAt:'2027-09-20T00:00:00Z'};
beforeEach(()=>sessionStorage.clear());
it('explains scheduled access and zero new credits, and can be acknowledged',()=>{
 render(<PromotionActivationNotice notice={notice} userId="customer"/>);
 expect(screen.getByText('Your trial stays free')).toBeTruthy();
 expect(screen.getByText(/Zero new included Email & SMS credits/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Continue planning'}));
 expect(screen.queryByRole('dialog')).toBeNull();
});
it('does not display a notice without a verified state',()=>{
 render(<PromotionActivationNotice notice={null} userId="customer"/>);
 expect(screen.queryByRole('dialog')).toBeNull();
});
it('validates the credit threshold before presenting a server notice',()=>{
 const row={success:true,state:'scheduled',reservation_id:'fixture',code:'VENUE51',plan_key:'essential',percent_off:51,included_credits:150,starts_at:notice.startsAt,expires_at:notice.expiresAt};
 expect(parsePromotionNotice(row)).toBeNull();
 expect(parsePromotionNotice({...row,included_credits:0})).toMatchObject({percent:51,credits:0});
 expect(parsePromotionNotice({...row,included_credits:0,percent_off:50.5})).toBeNull();
});
