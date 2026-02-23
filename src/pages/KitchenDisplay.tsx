import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ChefHat, Check, Clock, Wifi, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import { getKitchenOrders, markAsServed, updateOrderItemStatus } from '@/services/orderService';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/types/pos';
import { playOrderNotification } from '@/lib/notificationSound';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

interface OrderItemWithStatus {
  id: string;
  quantity: number;
  notes: string | null;
  item_status: string;
  menu_item?: { id: string; name: string; price: number; image_url: string | null };
}

function OrderCard({ order, onItemToggle, onComplete, loading }: {
  order: Order;
  onItemToggle: (itemId: string, currentStatus: string) => void;
  onComplete: (orderId: string) => void;
  loading: boolean;
}) {
  const items = (order as any).order_items as OrderItemWithStatus[] || [];
  const allReady = items.length > 0 && items.every(i => i.item_status === 'ready');
  const readyCount = items.filter(i => i.item_status === 'ready').length;
  const tableNumber = (order as any).table?.table_number;
  const isDineIn = !!order.table_id;

  return (
    <Card className={`border-2 transition-colors ${allReady ? 'border-green-500/60 bg-green-500/5' : 'border-yellow-500/50 bg-yellow-500/5'}`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold font-mono tracking-wide">
              {order.order_number || order.id.slice(-8).toUpperCase()}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {isDineIn ? (
                <Badge variant="outline" className="text-xs gap-1">
                  <UtensilsCrossed className="h-3 w-3" />
                  Table {tableNumber}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1 border-orange-400 text-orange-600">
                  <ShoppingBag className="h-3 w-3" />
                  Takeaway
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timeAgo(order.created_at)}
            </div>
            <Badge className={`mt-1 text-xs ${allReady ? 'bg-green-500' : 'bg-yellow-500'}`}>
              {readyCount}/{items.length} ready
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        {items.map(item => {
          const isReady = item.item_status === 'ready';
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-colors ${
                isReady
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-background border border-border hover:bg-accent/50'
              }`}
              onClick={() => onItemToggle(item.id, item.item_status)}
            >
              <Checkbox
                checked={isReady}
                className={isReady ? 'border-green-500 data-[state=checked]:bg-green-500' : ''}
              />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${isReady ? 'line-through text-muted-foreground' : ''}`}>
                  {item.quantity}x {item.menu_item?.name || 'Item'}
                </span>
                {item.notes && (
                  <p className="text-xs text-muted-foreground italic truncate">{item.notes}</p>
                )}
              </div>
              {isReady && <Check className="h-4 w-4 text-green-500 shrink-0" />}
            </div>
          );
        })}

        {order.notes && (
          <div className="text-xs bg-muted p-2 rounded mt-2">
            <strong>Note:</strong> {order.notes}
          </div>
        )}

        {allReady && (
          <Button
            className="w-full mt-2 bg-green-600 hover:bg-green-700"
            onClick={() => onComplete(order.id)}
            disabled={loading}
          >
            <Check className="h-4 w-4 mr-2" />
            Complete Order
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function KitchenDisplay() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const data = await getKitchenOrders();
      setOrders(data);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to load kitchen orders:', error);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Auto-refresh timer to update "time ago"
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders(prev => [...prev]); // Force re-render for time updates
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Realtime subscription for orders
  useOrdersRealtime(
    useCallback(() => {
      playOrderNotification();
      loadOrders();
      toast({ title: 'New Order!', description: 'A new order has arrived' });
    }, [loadOrders, toast]),
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
    useCallback((deletedId: string) => {
      setOrders(prev => prev.filter(o => o.id !== deletedId));
    }, [])
  );

  // Realtime subscription for order_items changes
  useEffect(() => {
    const channel = supabase
      .channel('order-items-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_items' },
        () => {
          loadOrders(); // Reload when any item status changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  // Split orders into dine-in and takeaway
  const { dineInOrders, takeawayOrders } = useMemo(() => {
    const dineIn = orders.filter(o => o.table_id);
    const takeaway = orders.filter(o => !o.table_id);
    return { dineInOrders: dineIn, takeawayOrders: takeaway };
  }, [orders]);

  // Summary counts
  const totalItems = orders.reduce((sum, o) => sum + ((o as any).order_items?.length || 0), 0);
  const readyItems = orders.reduce((sum, o) => {
    return sum + ((o as any).order_items || []).filter((i: any) => i.item_status === 'ready').length;
  }, 0);
  const pendingItems = totalItems - readyItems;

  async function handleItemToggle(itemId: string, currentStatus: string) {
    try {
      const newStatus = currentStatus === 'ready' ? 'pending' : 'ready';
      await updateOrderItemStatus(itemId, newStatus);
      // Optimistic update
      setOrders(prev =>
        prev.map(o => ({
          ...o,
          order_items: ((o as any).order_items || []).map((item: any) =>
            item.id === itemId ? { ...item, item_status: newStatus } : item
          ),
        })) as Order[]
      );
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      loadOrders();
    }
  }

  async function handleComplete(orderId: string) {
    setLoading(true);
    try {
      await markAsServed(orderId);
      toast({ title: 'Order Served!', description: 'Order marked as served' });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      loadOrders();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Kitchen Display</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Live' : 'Connecting...'}
              </span>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">{orders.length} orders</Badge>
              <Badge className="bg-yellow-500">{pendingItems} pending</Badge>
              <Badge className="bg-green-500">{readyItems} ready</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No orders in queue</p>
              <p className="text-sm text-muted-foreground">New orders will appear here automatically</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dine-In Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Dine-In</h2>
                <Badge variant="outline">{dineInOrders.length}</Badge>
              </div>
              <ScrollArea className="h-[calc(100vh-160px)]">
                <div className="space-y-3 pr-2">
                  {dineInOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No dine-in orders</p>
                  ) : (
                    dineInOrders.map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onItemToggle={handleItemToggle}
                        onComplete={handleComplete}
                        loading={loading}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Takeaway Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold">Takeaway</h2>
                <Badge variant="outline">{takeawayOrders.length}</Badge>
              </div>
              <ScrollArea className="h-[calc(100vh-160px)]">
                <div className="space-y-3 pr-2">
                  {takeawayOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No takeaway orders</p>
                  ) : (
                    takeawayOrders.map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onItemToggle={handleItemToggle}
                        onComplete={handleComplete}
                        loading={loading}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
