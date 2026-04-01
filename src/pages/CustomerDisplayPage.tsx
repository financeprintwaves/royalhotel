import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import CustomerDisplayScreen from '@/components/CustomerDisplayScreen';
import type { Order } from '@/types/pos';

export default function CustomerDisplay() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const allOrders = useOrdersRealtime();

  useEffect(() => {
    if (orderId) {
      const foundOrder = allOrders.find(o => o.id === orderId);
      if (foundOrder) {
        setOrder(foundOrder);
        setLoading(false);
      }
    }
  }, [orderId, allOrders]);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-3xl text-white">Loading...</div>
      </div>
    );
  }

  const totalAmount = order
    ? (order as any).order_items?.reduce((sum: number, item: any) => {
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
