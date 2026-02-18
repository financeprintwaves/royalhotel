
CREATE OR REPLACE FUNCTION public.quick_pay_order(
  p_order_id uuid,
  p_amount numeric,
  p_payment_method payment_method,
  p_idempotency_key uuid,
  p_transaction_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_user_id UUID;
  v_user_branch_id UUID;
  v_payment_id UUID;
  v_existing_payment RECORD;
  v_item RECORD;
  v_prev_status order_status;
BEGIN
  v_user_id := auth.uid();
  v_user_branch_id := public.get_user_branch_id(v_user_id);

  -- Idempotency check
  SELECT * INTO v_existing_payment
  FROM public.payments
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'payment_id', v_existing_payment.id,
      'message', 'Payment already processed (idempotent)',
      'idempotent', true
    );
  END IF;

  -- Lock the order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Branch access check
  IF v_order.branch_id != v_user_branch_id AND NOT public.is_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied to this branch');
  END IF;

  IF v_order.locked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is already locked');
  END IF;

  -- Traverse state machine in-database: CREATED → SENT_TO_KITCHEN → SERVED → BILL_REQUESTED → PAID
  v_prev_status := v_order.order_status;

  IF v_prev_status = 'CREATED' THEN
    INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by)
    VALUES (p_order_id, 'CREATED', 'SENT_TO_KITCHEN', v_user_id);
    v_prev_status := 'SENT_TO_KITCHEN';
  END IF;

  IF v_prev_status = 'SENT_TO_KITCHEN' THEN
    INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by)
    VALUES (p_order_id, 'SENT_TO_KITCHEN', 'SERVED', v_user_id);
    v_prev_status := 'SERVED';
  END IF;

  IF v_prev_status = 'SERVED' THEN
    INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by)
    VALUES (p_order_id, 'SERVED', 'BILL_REQUESTED', v_user_id);
    v_prev_status := 'BILL_REQUESTED';
  END IF;

  IF v_prev_status != 'BILL_REQUESTED' THEN
    RETURN jsonb_build_object('success', false, 'error', 
      format('Cannot pay order in status %s', v_order.order_status));
  END IF;

  -- Validate amount
  IF p_amount < COALESCE(v_order.total_amount, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment amount is less than order total');
  END IF;

  -- Insert payment
  INSERT INTO public.payments (
    order_id, branch_id, processed_by, amount, payment_method,
    payment_status, idempotency_key, transaction_reference, notes
  ) VALUES (
    p_order_id, v_order.branch_id, v_user_id, p_amount, p_payment_method,
    'paid', p_idempotency_key, p_transaction_reference, p_notes
  )
  RETURNING id INTO v_payment_id;

  -- Final status log entry
  INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by)
  VALUES (p_order_id, 'BILL_REQUESTED', 'PAID', v_user_id);

  -- Update order to PAID
  UPDATE public.orders
  SET order_status = 'PAID',
      payment_status = 'paid',
      locked_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  -- Deduct inventory
  FOR v_item IN
    SELECT oi.menu_item_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    UPDATE public.inventory
    SET quantity = quantity - v_item.quantity,
        updated_at = now()
    WHERE branch_id = v_order.branch_id
      AND menu_item_id = v_item.menu_item_id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'message', 'Quick payment processed successfully',
    'idempotent', false
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
