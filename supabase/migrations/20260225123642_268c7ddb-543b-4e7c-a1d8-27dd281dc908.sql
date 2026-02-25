
-- Clear all order data for fresh start
DELETE FROM public.order_items;
DELETE FROM public.payments;
DELETE FROM public.order_status_log;
DELETE FROM public.refunds;
DELETE FROM public.orders;
UPDATE public.order_sequences SET last_sequence = 0;
UPDATE public.restaurant_tables SET status = 'available' WHERE status = 'occupied';
