-- Add foreign key from orders.created_by to profiles.user_id
-- This enables PostgREST to perform joins between orders and profiles for waiter names
ALTER TABLE public.orders
ADD CONSTRAINT orders_created_by_fkey_profiles
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id)
ON DELETE SET NULL;