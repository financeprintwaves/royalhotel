import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Printer, Eye } from 'lucide-react';
import { format } from 'date-fns';
import type { Order } from '@/types/pos';
import { printReceipt } from '@/services/printerService';
import { toast } from '@/hooks/use-toast';
import ReceiptDialog from '../ReceiptDialog';

interface BillsDialogProps {
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-500 text-white',
  SENT_TO_KITCHEN: 'bg-orange-500 text-white',
  SERVED: 'bg-green-500 text-white',
  BILL_REQUESTED: 'bg-amber-500 text-white',
  PAID: 'bg-emerald-600 text-white',
  CLOSED: 'bg-gray-500 text-white',
};

export default function BillsDialog({ onClose }: BillsDialogProps) {
  const [bills, setBills] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Order | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  useEffect(() => {
    // In production, fetch from API. Mock data for now:
    const mockBills: Order[] = [
      {
        id: '1', order_number: 'BILL001', order_status: 'BILL_REQUESTED',
        total_amount: 25.50, branch_id: '', table_id: 'table-1', created_by: null,
        payment_status: 'unpaid', subtotal: 23.18, tax_amount: 2.32,
        discount_amount: 0, notes: null, locked_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        table: { id: 'table-1', table_number: '5', capacity: 4 },
        order_items: []
      },
      {
        id: '2', order_number: 'BILL002', order_status: 'PAID',
        total_amount: 45.75, branch_id: '', table_id: null, created_by: null,
        payment_status: 'paid', subtotal: 41.59, tax_amount: 4.16,
        discount_amount: 0, notes: null, locked_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        order_items: []
      },
      {
        id: '3', order_number: 'BILL003', order_status: 'PAID',
        total_amount: 18.90, branch_id: '', table_id: 'table-2', created_by: null,
        payment_status: 'paid', subtotal: 17.18, tax_amount: 1.72,
        discount_amount: 0, notes: null, locked_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        table: { id: 'table-2', table_number: '8', capacity: 6 },
        order_items: []
      },
      {
        id: '4', order_number: 'BILL004', order_status: 'BILL_REQUESTED',
        total_amount: 32.40, branch_id: '', table_id: 'table-3', created_by: null,
        payment_status: 'unpaid', subtotal: 29.45, tax_amount: 2.95,
        discount_amount: 0, notes: null, locked_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        table: { id: 'table-3', table_number: '12', capacity: 8 },
        order_items: []
      },
    ];
    setBills(mockBills);
  }, []);

  const handleViewBill = (bill: Order) => {
    setSelectedBill(bill);
    setShowReceiptDialog(true);
  };

  const handlePrintBill = async (bill: Order) => {
    setLoading(true);
    try {
      const success = await printReceipt(bill);
      if (success) {
        toast({
          title: '🖨️ Bill Printed',
          description: `Bill ${bill.order_number} sent to printer`,
        });
      } else {
        toast({
          title: 'Print Failed',
          description: 'Failed to print bill',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: 'Print Error',
        description: 'An error occurred while printing',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterBills = (status: string) => {
    switch (status) {
      case 'pending':
        return bills.filter(bill => bill.order_status === 'BILL_REQUESTED');
      case 'paid':
        return bills.filter(bill => bill.payment_status === 'paid');
      case 'all':
      default:
        return bills;
    }
  };

  const renderBillsTable = (filteredBills: Order[]) => (
    <ScrollArea className="h-96">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-semibold">Bill #</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Table/Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.map((bill, index) => (
              <tr key={bill.id} className={`border-b hover:bg-muted/50 ${index % 2 === 0 ? '' : 'bg-muted/20'}`}>
                <td className="px-4 py-3 text-sm font-medium">{bill.order_number}</td>
                <td className="px-4 py-3 text-sm">
                  {bill.table ? `Table ${bill.table.table_number}` : 'Takeaway'}
                </td>
                <td className="px-4 py-3">
                  <Badge className={`${STATUS_COLORS[bill.order_status]} text-xs`}>
                    {bill.order_status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                  ${bill.total_amount.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {format(new Date(bill.created_at), 'HH:mm')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewBill(bill)}
                      className="h-8 px-2"
                      disabled={loading}
                    >
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintBill(bill)}
                      className="h-8 px-2"
                      disabled={loading}
                    >
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
  );

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Bills Management
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pending Bills ({filterBills('pending').length})
              </TabsTrigger>
              <TabsTrigger value="paid">
                Paid Bills ({filterBills('paid').length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All Bills ({filterBills('all').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {renderBillsTable(filterBills('pending'))}
            </TabsContent>

            <TabsContent value="paid" className="mt-4">
              {renderBillsTable(filterBills('paid'))}
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              {renderBillsTable(filterBills('all'))}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showReceiptDialog && selectedBill && (
        <ReceiptDialog
          open={showReceiptDialog}
          onOpenChange={setShowReceiptDialog}
          order={selectedBill}
        />
      )}
    </>
  );
}