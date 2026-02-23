ALTER TABLE public.order_items
  ADD COLUMN item_status TEXT NOT NULL DEFAULT 'pending';

-- Add RLS policy for kitchen staff to update order items (for item_status toggling)
CREATE POLICY "Kitchen staff can update item status"
ON public.order_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
    AND (o.branch_id = get_user_branch_id(auth.uid()))
    AND (has_role(auth.uid(), 'kitchen') OR is_manager_or_admin(auth.uid()))
  )
);

-- Enable realtime for order_items so kitchen display updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;