import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChefHat, Check, Clock } from 'lucide-react';
import { getKitchenOrders, markAsServed } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/types/pos';

export default function KitchenDisplay() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  async function loadOrders() {
    try {
      const data = await getKitchenOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load kitchen orders:', error);
    }
  }

  async function handleMarkServed(orderId: string) {
    setLoading(true);
    try {
      await markAsServed(orderId);
      toast({ title: 'Order Served!', description: 'Order marked as served' });
      loadOrders();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Kitchen Display</h1>
          </div>
          <Badge variant="secondary" className="ml-auto">{orders.length} orders</Badge>
        </div>
      </header>

      <main className="p-6">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No orders in queue</p>
              <p className="text-sm text-muted-foreground">New orders will appear here automatically</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map(order => (
              <Card key={order.id} className="border-2 border-yellow-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>{(order as any).table?.table_number || 'Takeaway'}</span>
                    <Badge className="bg-yellow-500">{order.order_status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    {((order as any).order_items || []).map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.menu_item?.name || 'Item'}</span>
                        {item.notes && <span className="text-muted-foreground italic">{item.notes}</span>}
                      </div>
                    ))}
                  </div>
                  {order.notes && (
                    <div className="text-sm bg-muted p-2 rounded">
                      <strong>Note:</strong> {order.notes}
                    </div>
                  )}
                  <Button 
                    className="w-full" 
                    onClick={() => handleMarkServed(order.id)} 
                    disabled={loading}
                  >
                    <Check className="h-4 w-4 mr-2" />Mark as Served
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
