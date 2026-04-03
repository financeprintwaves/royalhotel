import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Printer, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import ReceiptDialog from '../ReceiptDialog';
import type { Order, OrderStatus } from '@/types/pos';

interface OrdersDialogProps {
  onClose: () => void;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  CREATED: 'bg-blue-500 text-white',
  SENT_TO_KITCHEN: 'bg-orange-500 text-white',
  SERVED: 'bg-green-500 text-white',
  BILL_REQUESTED: 'bg-amber-500 text-white',
  PAID: 'bg-emerald-600 text-white',
  CLOSED: 'bg-gray-500 text-white',
};

export default function OrdersDialog({ onClose }: OrdersDialogProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  useEffect(() => {
    // In production, fetch from API. Mock data for now:
    const mockOrders: Order[] = [
      {
        id: '1', order_number: 'ORD001', order_status: 'CREATED',
        total_amount: 25.50, branch_id: '', table_id: null, created_by: null,
        payment_status: 'unpaid', subtotal: 23.18, tax_amount: 2.32,
        discount_amount: 0, notes: null, locked_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
      {
        id: '2', order_number: 'ORD002', order_status: 'PAID',
        total_amount: 45.75, branch_id: '', table_id: null, created_by: null,
        payment_status: 'paid', subtotal: 41.59, tax_amount: 4.16,
        discount_amount: 0, notes: null, locked_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
      {
        id: '3', order_number: 'ORD003', order_status: 'SERVED',
        total_amount: 18.90, branch_id: '', table_id: null, created_by: null,
        payment_status: 'unpaid', subtotal: 17.18, tax_amount: 1.72,
        discount_amount: 0, notes: null, locked_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
    ];
    setOrders(mockOrders);
  }, []);

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Today's Orders
              <Badge variant="secondary" className="ml-2">{orders.length} orders</Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-96">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Order #</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Value</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr key={order.id} className={`border-b hover:bg-muted/50 ${index % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="px-4 py-3 text-sm font-medium">{order.order_number}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${STATUS_COLORS[order.order_status]} text-xs`}>
                          {order.order_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                        ${order.total_amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {format(new Date(order.created_at), 'HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setShowReceiptDialog(true); }} className="h-8 px-2">
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setShowReceiptDialog(true); }} className="h-8 px-2">
                            <Printer className="h-3 w-3 mr-1" /> Print
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
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showReceiptDialog && selectedOrder && (
        <ReceiptDialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog} order={selectedOrder} />
      )}
    </>
  );
}
