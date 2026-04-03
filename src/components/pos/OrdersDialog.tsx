import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Printer } from 'lucide-react';
import { format } from 'date-fns';
import ReceiptDialog from '../ReceiptDialog';
import type { Order } from '@/types/pos';

interface OrdersDialogProps {
  onClose: () => void;
}

const STATUS_COLORS = {
  HOLD: 'bg-yellow-500 text-black',
  CREATED: 'bg-blue-500 text-white',
  SENT_TO_KITCHEN: 'bg-orange-500 text-white',
  SERVED: 'bg-green-500 text-white',
  PAID: 'bg-emerald-600 text-white',
  CLOSED: 'bg-gray-500 text-white',
};

export default function OrdersDialog({ onClose }: OrdersDialogProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  // Mock data for demonstration - in real app, fetch from API
  useEffect(() => {
    const mockOrders: Order[] = [
      {
        id: '1',
        order_number: 'ORD001',
        order_status: 'HOLD',
        total_amount: 25.50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [],
      },
      {
        id: '2',
        order_number: 'ORD002',
        order_status: 'PAID',
        total_amount: 45.75,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [],
      },
      {
        id: '3',
        order_number: 'ORD003',
        order_status: 'SERVED',
        total_amount: 18.90,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [],
      },
    ];
    setOrders(mockOrders);
  }, []);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowReceiptDialog(true);
  };

  const handlePrintOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowReceiptDialog(true);
    // The ReceiptDialog will handle printing
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📋 Today's Orders
              <Badge variant="secondary" className="ml-2">
                {orders.length} orders
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
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Value
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
                  {orders.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`border-b hover:bg-blue-25 dark:hover:bg-blue-950/50 ${
                        index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-25 dark:bg-gray-800'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {order.order_number}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`${STATUS_COLORS[order.order_status]} text-xs`}
                        >
                          {order.order_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        ${order.total_amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(order.created_at), 'HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewOrder(order)}
                            className="h-8 px-2"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintOrder(order)}
                            className="h-8 px-2"
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            Print
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Receipt Dialog */}
      {showReceiptDialog && selectedOrder && (
        <ReceiptDialog
          open={showReceiptDialog}
          onOpenChange={setShowReceiptDialog}
          order={selectedOrder}
        />
      )}
    </>
  );
}