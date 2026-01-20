import { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import Receipt from './Receipt';
import { getOrderPayments } from '@/services/paymentService';
import type { Order, Payment } from '@/types/pos';

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  autoPrint?: boolean;
}

export default function ReceiptDialog({ open, onOpenChange, order, autoPrint = false }: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [hasPrinted, setHasPrinted] = useState(false);

  useEffect(() => {
    if (order && open) {
      getOrderPayments(order.id)
        .then(setPayments)
        .catch(console.error);
      setHasPrinted(false);
    }
  }, [order, open]);

  // Auto-print when dialog opens with autoPrint flag
  useEffect(() => {
    if (open && autoPrint && !hasPrinted && receiptRef.current) {
      const timer = setTimeout(() => {
        handlePrint();
        setHasPrinted(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open, autoPrint, hasPrinted]);

  function handlePrint() {
    if (!receiptRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptContent = receiptRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 20px;
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-fit">
        <DialogHeader>
          <DialogTitle>Receipt Preview</DialogTitle>
        </DialogHeader>
        
        <div className="border rounded-lg overflow-hidden">
          <Receipt 
            ref={receiptRef}
            order={order} 
            payments={payments}
            branchName="Downtown Bistro"
            branchAddress="123 Main Street"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
