import React from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { usePOSWorkflow } from '@/hooks/usePOSWorkflow';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

interface KOTPrintDialogProps {
  onClose: () => void;
}

export default function KOTPrintDialog({ onClose }: KOTPrintDialogProps) {
  const { cartItems, selectedTableName, orderType } = usePOSContext();
  const { handleAddItemToOrder, printKOTMutation } = usePOSWorkflow();

  const handlePrint = async () => {
    try {
      await handleAddItemToOrder();
      await printKOTMutation.mutateAsync();
    } catch (error) {
      console.error('KOT print failed:', error);
    }
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Kitchen Order Ticket
          </DialogTitle>
        </DialogHeader>

        <div className="bg-white border-2 border-black p-4 font-mono text-xs space-y-2 max-h-96 overflow-y-auto text-black">
          <div className="text-center font-bold">════════════════════════</div>
          <div className="text-center font-bold">KITCHEN ORDER TICKET</div>
          <div className="text-center">
            {orderType === 'takeout' ? 'TAKE OUT' : `${selectedTableName || 'Table'}`} | {format(new Date(), 'hh:mm a')}
          </div>
          <div className="text-center font-bold">════════════════════════</div>

          <div className="space-y-1">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.menuItem.name}</span>
                <span className="ml-2 font-bold">× {item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="text-center">════════════════════════</div>
          <div className="text-right text-xs text-gray-500">
            {format(new Date(), 'MM/dd/yyyy HH:mm:ss')}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handlePrint} className="bg-amber-600 hover:bg-amber-500 text-white">
            <Printer className="w-4 h-4 mr-2" /> Print KOT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
