import { useRef, useEffect, useState, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import Receipt from './Receipt';
import { getOrderPayments } from '@/services/paymentService';
import { silentPrintHTML, getPrintStatus, type PrintMethod } from '@/services/printService';
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

const STATUS_COLORS: Record<PrintMethod, { dot: string; label: string }> = {
  qz: { dot: 'bg-green-500', label: 'QZ Tray connected' },
  daemon: { dot: 'bg-yellow-500', label: 'Local printer ready' },
  none: { dot: 'bg-muted-foreground/40', label: 'No silent printer' },
};

export default function ReceiptDialog({ open, onOpenChange, order, autoPrint = false }: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [waiterName, setWaiterName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [printMethod, setPrintMethod] = useState<PrintMethod>('none');
  const { profile } = useAuth();

  // Browser print dialog fallback via react-to-print
  const handleBrowserPrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${order?.order_number || order?.id?.slice(-8)}`,
    pageStyle: `
      @page { size: 80mm auto; margin: 0; }
      @media print {
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  // Check printer status when dialog opens
  useEffect(() => {
    if (open) {
      getPrintStatus().then(setPrintMethod);
    }
  }, [open]);

  useEffect(() => {
    if (order && open) {
      setIsLoading(true);
      setHasPrinted(false);

      Promise.all([
        getOrderPayments(order.id)
          .then(data => setPayments(data || []))
          .catch(err => { console.error('Failed to load payments:', err); setPayments([]); }),

        Promise.all([
          order.created_by
            ? Promise.resolve(supabase.from('profiles').select('full_name').eq('user_id', order.created_by).maybeSingle())
                .then(({ data, error }) => { if (error) console.error(error); setWaiterName(data?.full_name || ''); })
                .catch(() => setWaiterName(''))
            : Promise.resolve(),

          profile?.branch_id
            ? Promise.resolve(supabase.from('branches').select('name, address, phone, logo_url').eq('id', profile.branch_id).maybeSingle())
                .then(({ data, error }) => { if (error) console.error(error); if (data) setBranchInfo(data); })
                .catch(() => {})
            : Promise.resolve(),
        ]),
      ]).finally(() => setIsLoading(false));
    }
  }, [order, open, profile?.branch_id]);

  // Auto-print using unified pipeline
  useEffect(() => {
    async function autoprint() {
      if (!receiptRef.current) return;
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('Auto-printing receipt for order:', order?.order_number || order?.id);
      const html = receiptRef.current.outerHTML;
      const sent = await silentPrintHTML(html);
      if (sent) {
        console.log('[print] Auto-print succeeded');
      } else {
        console.info('[print] Auto-print: no silent method available, skipping.');
      }
      setHasPrinted(true);
    }

    if (open && autoPrint && !hasPrinted && receiptRef.current) {
      autoprint();
    }
  }, [open, autoPrint, hasPrinted, order?.order_number, order?.id]);

  // Manual print: try silent first, fall back to browser dialog
  const onPrintClick = useCallback(async () => {
    if (!receiptRef.current) return;
    const html = receiptRef.current.outerHTML;
    const sent = await silentPrintHTML(html);
    if (!sent) {
      // Last resort: browser print dialog
      handleBrowserPrint();
    }
  }, [handleBrowserPrint]);

  if (!order) return null;

  const status = STATUS_COLORS[printMethod];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-fit">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📄 Receipt Preview
            <span className="inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground ml-auto" title={status.label}>
              <span className={`h-2 w-2 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </DialogTitle>
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
