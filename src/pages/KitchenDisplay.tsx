import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ChefHat, Check, Clock, Wifi, WifiOff, UtensilsCrossed, ShoppingBag, Flame, Bell, Volume2 } from 'lucide-react';
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
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function getUrgencyLevel(dateStr: string): 'normal' | 'warning' | 'urgent' {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins >= 15) return 'urgent';
  if (mins >= 8) return 'warning';
  return 'normal';
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
  const urgency = getUrgencyLevel(order.created_at);

  const cardBorder = allReady
    ? 'border-emerald-400 shadow-emerald-500/20'
    : urgency === 'urgent'
    ? 'border-red-400 shadow-red-500/20 animate-pulse'
    : urgency === 'warning'
    ? 'border-amber-400 shadow-amber-500/20'
    : 'border-sky-400/50 shadow-sky-500/10';

  const cardBg = allReady
    ? 'bg-gradient-to-br from-emerald-950/80 to-emerald-900/40'
    : urgency === 'urgent'
    ? 'bg-gradient-to-br from-red-950/80 to-red-900/40'
    : urgency === 'warning'
    ? 'bg-gradient-to-br from-amber-950/60 to-amber-900/30'
    : 'bg-gradient-to-br from-slate-900/80 to-slate-800/60';

  const headerBg = allReady
    ? 'bg-emerald-500/15'
    : urgency === 'urgent'
    ? 'bg-red-500/15'
    : urgency === 'warning'
    ? 'bg-amber-500/15'
    : 'bg-sky-500/10';

  return (
    <div className={`rounded-xl border-2 ${cardBorder} ${cardBg} shadow-lg overflow-hidden transition-all duration-300`}>
      {/* Card Header */}
      <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm ${
            isDineIn
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
          }`}>
            {isDineIn ? (
              <span>T{tableNumber}</span>
            ) : (
              <ShoppingBag className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="font-mono font-bold text-white tracking-wider text-sm">
              {order.order_number || order.id.slice(-8).toUpperCase()}
            </p>
            <p className="text-xs text-slate-400">
              {isDineIn ? `Table ${tableNumber}` : 'Takeaway'}
              {(order as any).customer_name && ` · ${(order as any).customer_name}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
            urgency === 'urgent'
              ? 'bg-red-500/20 text-red-300'
              : urgency === 'warning'
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-slate-700 text-slate-300'
          }`}>
            {urgency === 'urgent' && <Flame className="h-3 w-3" />}
            <Clock className="h-3 w-3" />
            {timeAgo(order.created_at)}
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-xs font-semibold ${allReady ? 'text-emerald-400' : 'text-slate-400'}`}>
              {readyCount}/{items.length}
            </span>
            <div className="flex gap-0.5">
              {items.map((item, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    item.item_status === 'ready' ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="px-3 py-2 space-y-1.5">
        {items.map(item => {
          const isReady = item.item_status === 'ready';
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                isReady
                  ? 'bg-emerald-500/10 border border-emerald-500/25'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
              onClick={() => onItemToggle(item.id, item.item_status)}
            >
              <Checkbox
                checked={isReady}
                className={`h-5 w-5 rounded ${
                  isReady
                    ? 'border-emerald-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500'
                    : 'border-slate-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                    isReady ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'
                  }`}>
                    {item.quantity}
                  </span>
                  <span className={`text-sm font-medium ${
                    isReady ? 'line-through text-slate-500' : 'text-white'
                  }`}>
                    {item.menu_item?.name || 'Item'}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-xs text-amber-400/80 mt-0.5 ml-8 italic">⚡ {item.notes}</p>
                )}
              </div>
              {isReady && <Check className="h-5 w-5 text-emerald-400 shrink-0" />}
            </div>
          );
        })}

        {order.notes && (
          <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded-lg mt-2">
            📝 <strong>Note:</strong> {order.notes}
          </div>
        )}

        {allReady && (
          <Button
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all duration-200"
            onClick={() => onComplete(order.id)}
            disabled={loading}
            size="lg"
          >
            <Check className="h-5 w-5 mr-2" />
            Complete Order
          </Button>
        )}
      </div>
    </div>
  );
}

export default function KitchenDisplay() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevOrderCountRef = useRef(0);

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

  // Auto-refresh timer to update "time ago" and urgency
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders(prev => [...prev]);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Realtime subscription for orders
  useOrdersRealtime(
    useCallback(() => {
      if (soundEnabled) {
        playOrderNotification();
      }
      loadOrders();
      toast({
        title: '🔔 New Order!',
        description: 'A new order has arrived in the kitchen',
      });
    }, [loadOrders, toast, soundEnabled]),
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
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  const { dineInOrders, takeawayOrders } = useMemo(() => {
    const dineIn = orders.filter(o => o.table_id);
    const takeaway = orders.filter(o => !o.table_id);
    return { dineInOrders: dineIn, takeawayOrders: takeaway };
  }, [orders]);

  const totalItems = orders.reduce((sum, o) => sum + ((o as any).order_items?.length || 0), 0);
  const readyItems = orders.reduce((sum, o) => {
    return sum + ((o as any).order_items || []).filter((i: any) => i.item_status === 'ready').length;
  }, 0);
  const pendingItems = totalItems - readyItems;

  async function handleItemToggle(itemId: string, currentStatus: string) {
    try {
      const newStatus = currentStatus === 'ready' ? 'pending' : 'ready';
      await updateOrderItemStatus(itemId, newStatus);
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
      if (soundEnabled) {
        // Play a completion sound (lower tone)
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
        } catch {}
      }
      toast({ title: '✅ Order Served!', description: 'Order marked as served' });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      loadOrders();
    } finally {
      setLoading(false);
    }
  }

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    sectionOrders: Order[],
    emptyMessage: string,
    accentColor: string
  ) => (
    <div className="flex-1 min-w-0">
      <div className={`flex items-center gap-3 mb-4 px-1`}>
        <div className={`p-2 rounded-lg ${accentColor}`}>{icon}</div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <Badge className="bg-white/10 text-white border-0 font-mono">
          {sectionOrders.length}
        </Badge>
      </div>
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="space-y-4 pr-2">
          {sectionOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Clock className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            sectionOrders.map(order => (
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
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Professional Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white hover:bg-white/10">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>

          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-orange-500/20">
              <ChefHat className="h-5 w-5 text-orange-400" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Kitchen Display</h1>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {/* Sound Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`gap-1.5 ${soundEnabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-400'} hover:bg-white/10`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              <span className="text-xs">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </Button>

            {/* Connection Status */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isConnected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
            }`}>
              {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isConnected ? 'Live' : 'Offline'}
            </div>

            {/* Stats Bar */}
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                <span className="text-2xl font-bold text-white">{orders.length}</span>
                <span className="text-xs text-slate-400">orders</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                <span className="text-2xl font-bold text-amber-400">{pendingItems}</span>
                <span className="text-xs text-amber-400/70">pending</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                <span className="text-2xl font-bold text-emerald-400">{readyItems}</span>
                <span className="text-xs text-emerald-400/70">ready</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
            <div className="p-6 rounded-full bg-white/5 mb-6">
              <ChefHat className="h-16 w-16 opacity-30" />
            </div>
            <p className="text-xl font-medium text-slate-400">No orders in queue</p>
            <p className="text-sm text-slate-600 mt-1">New orders will appear here automatically with a sound alert</p>
            <div className="flex items-center gap-2 mt-6 text-xs text-slate-600">
              <Wifi className="h-3.5 w-3.5" />
              <span>Listening for new orders...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderSection(
              'Dine-In',
              <UtensilsCrossed className="h-5 w-5 text-sky-400" />,
              dineInOrders,
              'No dine-in orders',
              'bg-sky-500/15'
            )}
            {renderSection(
              'Takeaway',
              <ShoppingBag className="h-5 w-5 text-orange-400" />,
              takeawayOrders,
              'No takeaway orders',
              'bg-orange-500/15'
            )}
          </div>
        )}
      </main>
    </div>
  );
}
