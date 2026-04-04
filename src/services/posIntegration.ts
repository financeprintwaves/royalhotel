/**
 * POS Integration Services
 * Bridges between POS components and existing Supabase services
 */

import { Order, CartItem } from '@/types/pos';

/**
 * Create a new order from cart and table selection
 */
export async function createPOSOrder(
  tableId: string | null,
  orderType: 'dine-in' | 'takeout' | 'delivery',
  branchId: string,
  userId: string
) {
  const { createOrder } = await import('./orderService');
  
  const order = await createOrder(branchId, userId, tableId || undefined);
  return order;
}

/**
 * Add cart items to existing order
 */
export async function addCartItemsToOrder(
  orderId: string,
  cartItems: CartItem[]
) {
  const { addOrderItemsBatch } = await import('./orderService');
  
  const orderItems = cartItems.map((item) => ({
    menuItem: item.menuItem,
    quantity: item.quantity,
    notes: item.notes,
    portionName: item.portionName,
  }));

  await addOrderItemsBatch(orderId, orderItems);
}

/**
 * Print KOT (Kitchen Order Ticket) - no prices
 */
export async function printKOT(
  order: Order,
  cartItems: CartItem[]
) {
  try {
    const { printKOT: printKOTService } = await import('./printerService');
    
    const kotItems = cartItems.map((item) => ({
      description: item.menuItem.description || item.menuItem.name,
      quantity: item.quantity,
      notes: item.notes,
    }));

    await printKOTService(
      order.table_id || 'TAKEOUT',
      kotItems,
      order.id
    );

    return true;
  } catch (error) {
    console.error('Error printing KOT:', error);
    throw error;
  }
}

/**
 * Process payment and print receipt
 */
export async function processPaymentAndPrint(
  order: Order,
  cartItems: CartItem[],
  paymentData: {
    amount: number;
    method: 'cash' | 'card' | 'transfer' | 'split';
    tip?: number;
  }
) {
  try {
    const { finalizePayment } = await import('./paymentService');
    const { printReceipt } = await import('./printerService');
    
    const payment = await finalizePayment(
      order.id,
      paymentData.amount,
      paymentData.method as any,
    );

    const receiptItems = cartItems.map((item) => ({
      description: item.menuItem.description,
      quantity: item.quantity,
      price: item.menuItem.price,
      total: item.menuItem.price * item.quantity,
    }));

    const subtotal = receiptItems.reduce((sum, item) => sum + item.total, 0);

    await printReceipt({
      orderId: order.id,
      items: receiptItems,
      subtotal,
      tax: subtotal * 0.1,
      total: paymentData.amount,
      payment: paymentData,
      timestamp: new Date(),
    });

    return payment;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}

/**
 * Send order to kitchen (change status to SENT_TO_KITCHEN)
 */
export async function sendToKitchenPOS(orderId: string) {
  const { sendToKitchen } = await import('./orderService');
  await sendToKitchen(orderId);
}

/**
 * Hold current order (save locally)
 */
export async function holdOrderPOS(_orderId: string) {
  // Hold orders are managed via localStorage in POSActionPanel
  console.log('Order held locally');
}

/**
 * Recall held order
 */
export async function recallHeldOrderPOS(orderId: string) {
  const { getOrders } = await import('./orderService');
  const orders = await getOrders(['CREATED'], 1);
  return orders.find((o: any) => o.id === orderId) || null;
}

/**
 * Apply discount to order
 */
export async function applyDiscountPOS(
  orderId: string,
  discountAmount: number
) {
  const { applyDiscount } = await import('./orderService');
  await applyDiscount(orderId, discountAmount);
}

/**
 * Close order after payment
 */
export async function closeOrderPOS(orderId: string) {
  const { updateOrderStatus } = await import('./orderService');
  await updateOrderStatus(orderId, 'CLOSED');
}
