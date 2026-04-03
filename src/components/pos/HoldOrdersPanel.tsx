import React from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Pause } from 'lucide-react';
import { format } from 'date-fns';

interface HoldOrdersPanelProps {
  onClose: () => void;
}

export default function HoldOrdersPanel({ onClose }: HoldOrdersPanelProps) {
  const { setCartItems } = usePOSContext();

  // Read held orders from localStorage
  const getHeldOrders = (): any[] => {
    try {
      return JSON.parse(localStorage.getItem('pos_held_orders') || '[]');
    } catch {
      return [];
    }
  };

  const [heldOrders, setHeldOrders] = React.useState<any[]>(getHeldOrders);

  const handleRecallOrder = (order: any) => {
    setCartItems(order.items || []);
    const updated = heldOrders.filter(o => o.id !== order.id);
    setHeldOrders(updated);
    localStorage.setItem('pos_held_orders', JSON.stringify(updated));
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="w-5 h-5" />
            Held Orders
            <Badge variant="secondary" className="ml-2">{heldOrders.length} orders</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-96">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Order</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Items</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {heldOrders.map((order: any, index: number) => (
                  <tr key={order.id} className={`border-b hover:bg-muted/50 ${index % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-4 py-3 text-sm font-medium">{order.id?.slice(-8)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{order.items?.length || 0} items</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                      ${(order.total || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {order.createdAt ? format(new Date(order.createdAt), 'HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" onClick={() => handleRecallOrder(order)} className="h-8 px-3">
                        Recall
                      </Button>
                    </td>
                  </tr>
                ))}
                {heldOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No held orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
