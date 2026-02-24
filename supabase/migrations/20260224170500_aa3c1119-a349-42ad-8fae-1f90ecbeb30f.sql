-- Allow cashiers to delete order items from unlocked orders in their branch
CREATE POLICY "Cashiers can delete items from unlocked orders"
ON public.order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND o.branch_id = get_user_branch_id(auth.uid())
      AND o.locked_at IS NULL
      AND (has_role(auth.uid(), 'cashier') OR is_manager_or_admin(auth.uid()))
  )
);

-- Allow cashiers to update order items in unlocked orders in their branch
CREATE POLICY "Cashiers can update items in unlocked orders"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND o.branch_id = get_user_branch_id(auth.uid())
      AND o.locked_at IS NULL
      AND (has_role(auth.uid(), 'cashier') OR is_manager_or_admin(auth.uid()))
  )
);