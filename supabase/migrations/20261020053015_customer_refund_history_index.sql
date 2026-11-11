-- Supports customer-specific, stable newest-first refund history pagination.
CREATE INDEX IF NOT EXISTS admin_payment_refunds_customer_history_idx
ON public.admin_payment_refunds (account_owner_id, created_at DESC, id DESC);
