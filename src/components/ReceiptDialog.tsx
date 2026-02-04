import { useRef, useEffect, useState, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import Receipt from './Receipt';
import { getOrderPayments } from '@/services/paymentService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Order, Payment } from '@/types/pos';

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  autoPrint?: boolean;
}

interface BranchInfo {
  name: string;
  address?: string;
  phone?: string;
}

export default function ReceiptDialog({ open, onOpenChange, order, autoPrint = false }: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [waiterName, setWaiterName] = useState<string>('');
  const { profile } = useAuth();

  // Use react-to-print for fast, reliable printing
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${order?.order_number || order?.id?.slice(-8)}`,
    pageStyle: `
      @page {
        size: 80mm auto;
        margin: 0;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  useEffect(() => {
    if (order && open) {
      getOrderPayments(order.id)
        .then(setPayments)
        .catch(console.error);
      setHasPrinted(false);
      
      // Fetch waiter name
      if (order.created_by) {
        supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', order.created_by)
          .maybeSingle()
          .then(({ data }) => {
            setWaiterName(data?.full_name || '');
          });
      }
    }
  }, [order, open]);

  // Fetch branch info
  useEffect(() => {
    async function fetchBranchInfo() {
      if (!profile?.branch_id) return;
      
      const { data } = await supabase
        .from('branches')
        .select('name, address, phone')
        .eq('id', profile.branch_id)
        .maybeSingle();
      
      if (data) {
        setBranchInfo(data);
      }
    }
    
    fetchBranchInfo();
  }, [profile?.branch_id]);

  // Auto-print immediately when dialog opens with autoPrint flag - NO DELAY
  useEffect(() => {
    if (open && autoPrint && !hasPrinted && receiptRef.current) {
      // Immediate print - no delay for fast checkout
      handlePrint();
      setHasPrinted(true);
    }
  }, [open, autoPrint, hasPrinted, handlePrint]);

  // Manual print button handler - uses same react-to-print
  const onPrintClick = useCallback(() => {
    handlePrint();
  }, [handlePrint]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-fit">
        <DialogHeader>
          <DialogTitle>Receipt Preview</DialogTitle>
          <DialogDescription>
            Order #{order.order_number || order.id.slice(-8).toUpperCase()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="border rounded-lg overflow-hidden bg-white print-receipt-container">
          <Receipt
            ref={receiptRef}
            order={order} 
            payments={payments}
            branchName={branchInfo?.name || 'Restaurant POS'}
            branchAddress={branchInfo?.address}
            branchPhone={branchInfo?.phone}
            waiterName={waiterName}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onPrintClick}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
