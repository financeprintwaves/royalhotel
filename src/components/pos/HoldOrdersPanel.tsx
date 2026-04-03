import React from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface HoldOrdersPanelProps {
  onClose: () => void;
}

export default function HoldOrdersPanel({ onClose }: HoldOrdersPanelProps) {
  const { heldOrders, setCartItems, setHeldOrders } = usePOSContext();

  const handleRecallOrder = (order: any) => {
    // Convert held order back to cart
    setCartItems(order.items || []);
    // Remove from held orders
    setHeldOrders(heldOrders.filter(o => o.id !== order.id));
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⏸️ Held Orders
            <Badge variant="secondary" className="ml-2">
              {heldOrders.length} orders
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-96">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-blue-50 dark:bg-blue-950">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Time
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {heldOrders.map((order, index) => (
                  <tr
                    key={order.id}
                    className={`border-b hover:bg-blue-25 dark:hover:bg-blue-950/50 ${
                      index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-25 dark:bg-gray-800'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {order.order_number || order.id.slice(-8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {order.items?.length || 0} items
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      ${order.total_amount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(order.created_at), 'HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          onClick={() => handleRecallOrder(order)}
                          className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Recall
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {heldOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No held orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
