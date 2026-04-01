import React from 'react';
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
import { format } from 'date-fns';

interface HoldOrdersPanelProps {
  onClose: () => void;
}

export default function HoldOrdersPanel({ onClose }: HoldOrdersPanelProps) {
  // Mock held orders data
  const heldOrders = [
    {
      id: '100000',
      orderId: 1,
      balance: 14.82,
      date: new Date(),
      type: 'TAKE OUT',
      firstName: 'SALES',
      lastName: 'SALES',
    },
    {
      id: '100001',
      orderId: 2,
      balance: 15.36,
      date: new Date(),
      type: 'TAKE OUT',
      firstName: 'SALES',
      lastName: 'SALES',
    },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Hold Orders</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-96 border rounded">
          <div className="p-4 space-y-2">
            <div className="grid grid-cols-7 gap-2 text-xs font-bold bg-muted p-2 rounded sticky top-0">
              <div>HOLD #</div>
              <div>ORD #</div>
              <div>BALANCE</div>
              <div>DATE</div>
              <div>TYPE</div>
              <div>FIRST</div>
              <div>LAST</div>
            </div>

            {heldOrders.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-7 gap-2 text-xs p-2 hover:bg-muted rounded cursor-pointer"
              >
                <div className="font-semibold">{order.id}</div>
                <div>{order.orderId}</div>
                <div className="font-bold text-green-600">${order.balance.toFixed(2)}</div>
                <div>{format(order.date, 'MM/dd/yyyy')}</div>
                <div className="bg-yellow-200 px-1 rounded text-center">{order.type}</div>
                <div>{order.firstName}</div>
                <div>{order.lastName}</div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2 justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              PRIOR
            </Button>
            <Button variant="outline" size="sm">
              NEXT
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              PRINT
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
