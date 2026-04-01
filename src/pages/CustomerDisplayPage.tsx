import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getOrder } from '@/services/orderService';
import CustomerDisplayScreen from '@/components/CustomerDisplayScreen';
import type { Order, OrderItem } from '@/types/pos';

export default function CustomerDisplay() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      if (orderId) {
        try {
          const fetchedOrder = await getOrder(orderId);
          setOrder(fetchedOrder);
        } catch (error) {
          console.error('Failed to fetch order:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-3xl text-white">Loading...</div>
      </div>
    );
  }

  const totalAmount = order
    ? (order.order_items || []).reduce((sum: number, item: OrderItem) => {
        return sum + (item.unit_price * item.quantity);
      }, 0) || 0
    : 0;

  const tax = order ? Number(order.tax_amount || 0) : 0;
  const discount = order ? Number(order.discount_amount || 0) : 0;

  return (
    <CustomerDisplayScreen
      order={order!}
      totalAmount={totalAmount}
      discount={discount}
      tax={tax}
    />
  );
}
