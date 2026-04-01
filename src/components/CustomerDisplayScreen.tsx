import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { Order, OrderItem } from '@/types/pos';

interface CustomerDisplayScreenProps {
  order?: Order | null;
  totalAmount?: number;
  discount?: number;
  tax?: number;
  message?: string;
}

const ORDER_STATUSES = {
  pending: { label: 'Order Placed', color: 'bg-blue-500', icon: Clock },
  preparing: { label: 'Preparing', color: 'bg-orange-500', icon: Clock },
  ready: { label: 'Ready Soon', color: 'bg-green-500', icon: CheckCircle2 },
  served: { label: 'Ready for Pickup', color: 'bg-green-600', icon: CheckCircle2 },
  completed: { label: 'Thank You!', color: 'bg-purple-600', icon: CheckCircle2 },
};

export default function CustomerDisplayScreen({
  order,
  totalAmount = 0,
  discount = 0,
  tax = 0,
  message = 'Thank you for your order!',
}: CustomerDisplayScreenProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!order) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
        <div className="text-center space-y-4">
          <div className="text-6xl font-bold text-primary opacity-20">WELCOME</div>
          <p className="text-2xl text-muted-foreground">{message}</p>
          <div className="text-9xl font-bold text-primary/10">
            {time.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  }

  const orderItems = order.order_items || [];
  const statusKey = order.order_status?.toLowerCase() as keyof typeof ORDER_STATUSES || 'pending';
  const statusConfig = ORDER_STATUSES[statusKey] || ORDER_STATUSES.pending;
  const StatusIcon = statusConfig.icon;

  const createdTime = new Date(order.created_at);
  const elapsedSeconds = Math.floor((Date.now() - createdTime.getTime()) / 1000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedDisplay = elapsedMinutes > 0 ? `${elapsedMinutes}m ${elapsedSeconds % 60}s` : `${elapsedSeconds}s`;

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex flex-col p-8 overflow-hidden">
      {/* Header with Status */}
      <div className={`${statusConfig.color} rounded-2xl p-6 mb-6 text-white shadow-2xl`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <StatusIcon className="h-10 w-10" />
            <div>
              <div className="text-4xl font-bold">{statusConfig.label}</div>
              <div className="text-lg opacity-90">Order #{order.order_number}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">{elapsedDisplay}</div>
            <div className="text-sm opacity-75">Time elapsed</div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6 overflow-y-auto">
        {orderItems.map((item: OrderItem, idx: number) => (
          <Card
            key={idx}
            className={`bg-slate-800 border-slate-700 ${
              item.item_status === 'ready' ? 'border-green-500 border-2 ring-2 ring-green-500/30' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="mb-3">
                {item.menu_item?.image_url ? (
                  <img
                    src={item.menu_item.image_url}
                    alt={item.menu_item?.name}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                ) : (
                  <div className="w-full h-32 bg-slate-600 rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-white mb-1">
                  {item.menu_item?.name || 'Item'}
                </div>
                <div className="text-2xl font-bold text-primary mb-2">
                  ×{item.quantity}
                </div>
                {item.item_status === 'ready' && (
                  <Badge className="bg-green-500 text-white text-xs py-1 px-2">
                    Ready!
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bill Summary */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-lg">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{(totalAmount + discount - tax).toFixed(3)} OMR</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-lg text-green-400">
                <span>Discount:</span>
                <span>-{discount.toFixed(3)} OMR</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-lg">
                <span className="text-muted-foreground">Tax:</span>
                <span>+{tax.toFixed(3)} OMR</span>
              </div>
            )}
          </div>
          <div className="border-t border-slate-600 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">Total Amount:</span>
              <span className="text-4xl font-bold text-primary">
                {totalAmount.toFixed(3)} OMR
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Message */}
      <div className="text-center mt-6 text-2xl text-muted-foreground">
        {statusConfig.label === 'Ready for Pickup' && '👍 Your order is ready! Please proceed to the counter.'}
        {statusConfig.label === 'Thank You!' && '🙏 Thank you for your business!'}
        {statusConfig.label === 'Preparing' && '⏳ Your order is being prepared with care...'}
        {statusConfig.label === 'Order Placed' && '✔️ Your order has been received!'}
      </div>
    </div>
  );
}
