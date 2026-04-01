import { Order, CartItem } from '@/types/pos';

const HELD_ORDERS_KEY = 'pos_held_orders';

interface HeldOrderData {
  orderId: string;
  items: CartItem[];
  tableId: string | null;
  orderType: 'dine-in' | 'takeout' | 'delivery';
  createdAt: string;
}

/**
 * Save order to held orders (localStorage)
 */
export function saveHeldOrder(
  orderId: string,
  items: CartItem[],
  tableId: string | null,
  orderType: 'dine-in' | 'takeout' | 'delivery'
) {
  try {
    const held = getHeldOrders();
    const newOrder: HeldOrderData = {
      orderId,
      items,
      tableId,
      orderType,
      createdAt: new Date().toISOString(),
    };

    held.push(newOrder);
    localStorage.setItem(HELD_ORDERS_KEY, JSON.stringify(held));
    return true;
  } catch (error) {
    console.error('Error saving held order:', error);
    return false;
  }
}

/**
 * Get all held orders from localStorage
 */
export function getHeldOrders(): HeldOrderData[] {
  try {
    const data = localStorage.getItem(HELD_ORDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading held orders:', error);
    return [];
  }
}

/**
 * Recall held order by orderId
 */
export function recallHeldOrder(orderId: string) {
  try {
    const held = getHeldOrders();
    const order = held.find((o) => o.orderId === orderId);
    if (order) {
      // Remove from held orders
      const updated = held.filter((o) => o.orderId !== orderId);
      localStorage.setItem(HELD_ORDERS_KEY, JSON.stringify(updated));
      return order;
    }
    return null;
  } catch (error) {
    console.error('Error recalling order:', error);
    return null;
  }
}

/**
 * Delete held order
 */
export function deleteHeldOrder(orderId: string) {
  try {
    const held = getHeldOrders();
    const updated = held.filter((o) => o.orderId !== orderId);
    localStorage.setItem(HELD_ORDERS_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Error deleting held order:', error);
    return false;
  }
}

/**
 * Clear all held orders
 */
export function clearHeldOrders() {
  try {
    localStorage.removeItem(HELD_ORDERS_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing held orders:', error);
    return false;
  }
}
