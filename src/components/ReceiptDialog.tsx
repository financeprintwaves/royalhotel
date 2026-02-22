import { useRef, useEffect, useState, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import Receipt from './Receipt';
import { getOrderPayments } from '@/services/paymentService';
import printToLocalPrinter from '@/services/printService';
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
  logo_url?: string;
}

export default function ReceiptDialog({ open, onOpenChange, order, autoPrint = false }: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [waiterName, setWaiterName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
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
      setIsLoading(true);
      setHasPrinted(false);
      
      // Fetch all optional data in parallel - don't block receipt display
      Promise.all([
        // Fetch payments for this order
        getOrderPayments(order.id)
          .then(data => setPayments(data || []))
          .catch(err => {
            console.error('Failed to load payments:', err);
            setPayments([]);
          }),
        
        // Fetch waiter name and branch info in parallel
        Promise.all([
          // Get waiter profile
          order.created_by 
            ? Promise.resolve(
                supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('user_id', order.created_by)
                  .maybeSingle()
              ).then(({ data, error }) => {
                  if (error) console.error('Failed to load waiter:', error);
                  setWaiterName(data?.full_name || '');
                })
                .catch(err => {
                  console.error('Failed to load waiter:', err);
                  setWaiterName('');
                })
            : Promise.resolve(),
          
          // Get branch info
          profile?.branch_id
            ? Promise.resolve(
                supabase
                  .from('branches')
                  .select('name, address, phone, logo_url')
                  .eq('id', profile.branch_id)
                  .maybeSingle()
              ).then(({ data, error }) => {
                  if (error) console.error('Failed to load branch:', error);
                  if (data) setBranchInfo(data);
                })
                .catch(err => {
                  console.error('Failed to load branch:', err);
                })
            : Promise.resolve(),
        ]),
      ]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [order, open, profile?.branch_id]);

  // Auto-print immediately when dialog opens with autoPrint flag - NO DELAY
  useEffect(() => {
    async function autoprint() {
      if (!receiptRef.current) return;
      
      try {
        // Wait for React to fully render and DOM to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Log for debugging
        console.log('Auto-printing receipt for order:', order?.order_number || order?.id);
        
        // Send inner HTML to local print daemon (if running)
        const html = receiptRef.current.outerHTML;
        const result = await printToLocalPrinter(html);
        console.log('Print sent to local daemon:', result);
        setHasPrinted(true);
      } catch (err) {
        // no local printer available or failed - fall back to browser print
        console.warn('Local printer failed or not reachable, attempting browser print', err);
        try {
          // Wait another moment for any pending renders
          await new Promise(resolve => setTimeout(resolve, 300));
          handlePrint();
          setHasPrinted(true);
        } catch (printErr) {
          console.error('Browser print also failed:', printErr);
          setHasPrinted(true);
        }
      }
    }

    if (open && autoPrint && !hasPrinted && receiptRef.current) {
      autoprint();
    }
  }, [open, autoPrint, hasPrinted, handlePrint, order?.order_number, order?.id]);

  // Manual print button handler - uses same react-to-print
  const onPrintClick = useCallback(() => {
    handlePrint();
  }, [handlePrint]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-fit">
        <DialogHeader>
          <DialogTitle>📄 Receipt Preview</DialogTitle>
          <DialogDescription>
            Order #{order.order_number || order.id.slice(-8).toUpperCase()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="border rounded-lg overflow-hidden bg-white print-receipt-container relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading details...</p>
              </div>
            </div>
          )}
          <Receipt
            ref={receiptRef}
            order={order} 
            payments={payments}
            branchName={branchInfo?.name || 'Restaurant POS'}
            branchAddress={branchInfo?.address}
            branchPhone={branchInfo?.phone}
            branchLogo={branchInfo?.logo_url || undefined}
            waiterName={waiterName}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onPrintClick} disabled={isLoading}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
