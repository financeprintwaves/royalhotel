import { supabase } from '@/integrations/supabase/client';
import type { 
  Order, 
  OrderItem, 
  OrderStatus, 
  UpdateOrderStatusResponse,
  MenuItem
} from '@/types/pos';

// Generate UUID for idempotency
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

// Get orders for current branch
export async function getOrders(statusFilter?: OrderStatus[]): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      table:restaurant_tables(id, table_number, capacity),
      order_items(
        *,
        menu_item:menu_items(id, name, price, image_url)
      )
    `)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter.length > 0) {
    query = query.in('order_status', statusFilter);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return (data || []) as unknown as Order[];
}

// Get single order
export async function getOrder(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      table:restaurant_tables(id, table_number, capacity),
      order_items(
        *,
        menu_item:menu_items(id, name, price, image_url)
      )
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as Order | null;
}

// Create new order
export async function createOrder(
  tableId: string | null,
  notes?: string
): Promise<Order> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  // Get user's branch
  const { data: profile } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('user_id', userData.user.id)
    .single();

  if (!profile?.branch_id) throw new Error('User not assigned to a branch');

  const { data, error } = await supabase
    .from('orders')
    .insert({
      branch_id: profile.branch_id,
      table_id: tableId,
      created_by: userData.user.id,
      order_status: 'CREATED',
      payment_status: 'unpaid',
      notes,
    })
    .select()
    .single();

  if (error) throw error;

  // Update table status to occupied
  if (tableId) {
    await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied' })
      .eq('id', tableId);
  }

  return data as Order;
}

// Add item to order
export async function addOrderItem(
  orderId: string,
  menuItem: MenuItem,
  quantity: number,
  notes?: string
): Promise<OrderItem> {
  // First check if order is editable
  const { data: order } = await supabase
    .from('orders')
    .select('locked_at, order_status')
    .eq('id', orderId)
    .single();

  if (order?.locked_at) {
    throw new Error('Order is locked and cannot be modified');
  }

  if (order?.order_status === 'PAID' || order?.order_status === 'CLOSED') {
    throw new Error('Cannot modify paid or closed orders');
  }

  const unitPrice = menuItem.price;
  const totalPrice = unitPrice * quantity;

  const { data, error } = await supabase
    .from('order_items')
    .insert({
      order_id: orderId,
      menu_item_id: menuItem.id,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      notes,
    })
    .select(`
      *,
      menu_item:menu_items(id, name, price, image_url)
    `)
    .single();

  if (error) throw error;

  // Recalculate order totals
  await recalculateOrderTotals(orderId);

  return data as unknown as OrderItem;
}

// Update order item quantity
export async function updateOrderItemQuantity(
  itemId: string,
  quantity: number
): Promise<OrderItem> {
  const { data: item } = await supabase
    .from('order_items')
    .select('order_id, unit_price')
    .eq('id', itemId)
    .single();

  if (!item) throw new Error('Item not found');

  // Check if order is editable
  const { data: order } = await supabase
    .from('orders')
    .select('locked_at, order_status')
    .eq('id', item.order_id)
    .single();

  if (order?.locked_at) {
    throw new Error('Order is locked and cannot be modified');
  }

  const totalPrice = item.unit_price * quantity;

  const { data, error } = await supabase
    .from('order_items')
    .update({
      quantity,
      total_price: totalPrice,
    })
    .eq('id', itemId)
    .select(`
      *,
      menu_item:menu_items(id, name, price, image_url)
    `)
    .single();

  if (error) throw error;

  await recalculateOrderTotals(item.order_id);

  return data as unknown as OrderItem;
}

// Remove order item
export async function removeOrderItem(itemId: string): Promise<void> {
  const { data: item } = await supabase
    .from('order_items')
    .select('order_id')
    .eq('id', itemId)
    .single();

  if (!item) throw new Error('Item not found');

  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;

  await recalculateOrderTotals(item.order_id);
}

// Recalculate order totals
async function recalculateOrderTotals(orderId: string): Promise<void> {
  const { data: items } = await supabase
    .from('order_items')
    .select('total_price')
    .eq('order_id', orderId);

  const subtotal = items?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
  const taxRate = 0.10; // 10% tax - can be made configurable
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  await supabase
    .from('orders')
    .update({
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    })
    .eq('id', orderId);
}

// Update order status via RPC
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<UpdateOrderStatusResponse> {
  const { data, error } = await supabase.rpc('update_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
  });

  if (error) throw error;
  return data as unknown as UpdateOrderStatusResponse;
}

// Send order to kitchen (shortcut)
export async function sendToKitchen(orderId: string): Promise<UpdateOrderStatusResponse> {
  return updateOrderStatus(orderId, 'SENT_TO_KITCHEN');
}

// Mark order as served (shortcut)
export async function markAsServed(orderId: string): Promise<UpdateOrderStatusResponse> {
  return updateOrderStatus(orderId, 'SERVED');
}

// Request bill (shortcut)
export async function requestBill(orderId: string): Promise<UpdateOrderStatusResponse> {
  return updateOrderStatus(orderId, 'BILL_REQUESTED');
}

// Close order (shortcut)
export async function closeOrder(orderId: string): Promise<UpdateOrderStatusResponse> {
  return updateOrderStatus(orderId, 'CLOSED');
}

// Get kitchen orders (for kitchen display)
export async function getKitchenOrders(): Promise<Order[]> {
  return getOrders(['SENT_TO_KITCHEN']);
}

// Get orders pending payment
export async function getPendingPaymentOrders(): Promise<Order[]> {
  return getOrders(['BILL_REQUESTED']);
}

// Apply discount to order
export async function applyDiscount(orderId: string, discountAmount: number): Promise<Order> {
  const { data: order } = await supabase
    .from('orders')
    .select('subtotal, tax_amount, locked_at')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Order not found');
  if (order.locked_at) throw new Error('Order is locked');

  const newTotal = Number(order.subtotal) + Number(order.tax_amount) - discountAmount;

  const { data, error } = await supabase
    .from('orders')
    .update({
      discount_amount: discountAmount,
      total_amount: Math.max(0, newTotal),
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data as Order;
}

// Update order notes
export async function updateOrderNotes(orderId: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ notes })
    .eq('id', orderId);

  if (error) throw error;
}
