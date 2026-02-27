ALTER TABLE public.payments DROP CONSTRAINT payments_amount_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check CHECK (amount >= 0);