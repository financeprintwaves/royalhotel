import { supabase } from '@/integrations/supabase/client';
import type { 
  Order, 
  OrderItem, 
  OrderStatus, 
  UpdateOrderStatusResponse,
  FinalizePaymentResponse,
  PaymentMethod,
  MenuItem
} from '@/types/pos';

// Generate UUID for idempotency
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

// Get orders for current branch (optimized: defaults to today's active + recent completed)
export async function getOrders(statusFilter?: OrderStatus[], limit: number = 50): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      table:restaurant_tables(id, table_number, capacity),
      order_items(
        *,
        menu_item:menu_items(id, name, price, image_url)
      ),
      waiter:profiles!orders_created_by_fkey_profiles(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

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
      ),
      waiter:profiles!orders_created_by_fkey_profiles(full_name)
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as Order | null;
}

// Create new order
export async function createOrder(
  tableId: string | null,
  customerName?: string,
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
      customer_name: customerName || null,
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

// Update customer name on order
export async function updateOrderCustomerName(orderId: string, customerName: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ customer_name: customerName })
    .eq('id', orderId);

  if (error) throw error;
}

// Search orders with filters
export async function searchOrders(params: {
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
  status?: OrderStatus[];
}): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      table:restaurant_tables(id, table_number, capacity),
      order_items(
        *,
        menu_item:menu_items(id, name, price, image_url)
      ),
      waiter:profiles!orders_created_by_fkey_profiles(full_name)
    `)
    .order('created_at', { ascending: false });

  if (params.startDate) {
    query = query.gte('created_at', params.startDate.toISOString());
  }

  if (params.endDate) {
    const endOfDay = new Date(params.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte('created_at', endOfDay.toISOString());
  }

  if (params.status && params.status.length > 0) {
    query = query.in('order_status', params.status);
  }

  if (params.searchTerm) {
    query = query.or(`customer_name.ilike.%${params.searchTerm}%,id.ilike.%${params.searchTerm}%`);
  }

  const { data, error } = await query.limit(100);
  
  if (error) throw error;
  return (data || []) as unknown as Order[];
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
  // Prices already include tax, no additional tax calculation needed
  const taxAmount = 0;
  const totalAmount = subtotal;

  await supabase
    .from('orders')
    .update({
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    })
    .eq('id', orderId);
}

// BATCH: Add multiple items to order in a single operation (MAJOR PERFORMANCE BOOST)
export async function addOrderItemsBatch(
  orderId: string,
  items: { menuItem: MenuItem; quantity: number; notes?: string; isServing?: boolean; portionName?: string }[]
): Promise<void> {
  if (items.length === 0) return;

  // Check if order is editable once
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

  // Prepare bulk insert data
  const insertData = items.map(item => {
    const portionName = item.portionName || null;
    console.log('[OrderService] Batch item:', item.menuItem.name, 'portionName:', portionName, 'raw:', item.portionName);
    return {
      order_id: orderId,
      menu_item_id: item.menuItem.id,
      quantity: item.quantity,
      unit_price: item.menuItem.price,
      total_price: item.menuItem.price * item.quantity,
      notes: item.notes || null,
      is_serving: item.isServing || false,
      portion_name: portionName,
    };
  });

  // Single bulk insert
  const { error } = await supabase
    .from('order_items')
    .insert(insertData);

  if (error) throw error;

  // Single recalculation at the end
  await recalculateOrderTotals(orderId);
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
  
  const response = data as unknown as UpdateOrderStatusResponse;
  if (!response.success) {
    throw new Error(response.error || 'Failed to update order status');
  }
  
  return response;
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

// Quick pay: single RPC that traverses CREATED→PAID, records payment, deducts inventory
export async function quickPayOrder(
  orderId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  transactionReference?: string,
  notes?: string
): Promise<FinalizePaymentResponse> {
  const idempotencyKey = generateIdempotencyKey();

  const { data, error } = await supabase.rpc('quick_pay_order', {
    p_order_id: orderId,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_idempotency_key: idempotencyKey,
    p_transaction_reference: transactionReference || null,
    p_notes: notes || null,
  });

  if (error) throw error;
  
  const response = data as unknown as FinalizePaymentResponse;
  if (!response.success) {
    throw new Error(response.error || 'Quick payment failed');
  }
  return response;
}

// Update individual order item status (for kitchen per-item tracking)
export async function updateOrderItemStatus(
  itemId: string,
  status: 'pending' | 'ready'
): Promise<void> {
  const { error } = await supabase
    .from('order_items')
    .update({ item_status: status } as any)
    .eq('id', itemId);

  if (error) throw error;
}

// Cancel order (admin only)
export async function cancelOrder(orderId: string): Promise<void> {
  // Get order with table info
  const { data: order } = await supabase
    .from('orders')
    .select('table_id')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) throw new Error('Order not found');

  // Update order status to CLOSED with cancelled payment status
  const { error } = await supabase
    .from('orders')
    .update({ 
      order_status: 'CLOSED',
      locked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) throw error;

  // Reset table if order had one
  if (order.table_id) {
    await supabase
      .from('restaurant_tables')
      .update({ status: 'available' })
      .eq('id', order.table_id);
  }
}
