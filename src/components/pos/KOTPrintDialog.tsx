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
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';

interface KOTPrintDialogProps {
  onClose: () => void;
}

export default function KOTPrintDialog({ onClose }: KOTPrintDialogProps) {
  const { cartItems, selectedTableName, orderType } = usePOSContext();

  const handlePrint = async () => {
    // Call printer service to print KOT
    console.log('Printing KOT...');
    // await printerService.printKOT(order);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kitchen Order Ticket (KOT)</DialogTitle>
        </DialogHeader>

        {/* KOT Preview */}
        <div className="bg-white border-2 border-black p-4 font-mono text-xs space-y-2 max-h-96 overflow-y-auto">
          <div className="text-center font-bold">
            ════════════════════════
          </div>
          <div className="text-center font-bold">
            KITCHEN ORDER TICKET
          </div>
          <div className="text-center">
            Order #: 12345
          </div>
          <div className="text-center">
            {orderType === 'takeout' ? 'TAKE OUT' : `${selectedTableName || 'Table'}`} | {format(new Date(), 'hh:mm a')}
          </div>
          <div className="text-center font-bold">
            ════════════════════════
          </div>

          {/* Items */}
          <div className="space-y-1">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.name}</span>
                <span className="ml-2 font-bold">× {item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            ════════════════════════
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {format(new Date(), 'MM/dd/yyyy HH:mm:ss')}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
            Print KOT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
