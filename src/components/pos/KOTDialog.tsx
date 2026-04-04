import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Printer, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import type { Order } from '@/types/pos';
import { printKOT } from '@/services/printerService';
import { toast } from '@/hooks/use-toast';

interface KOTDialogProps {
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

export default function KOTDialog({ onClose }: KOTDialogProps) {
  const [kots, setKots] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In production, fetch from API. Mock data for now:
    const mockKots: Order[] = [
      {
        id: '1', order_number: 'KOT001', order_status: 'CREATED',
        total_amount: 25.50, branch_id: '', table_id: 'table-1', created_by: null,
        payment_status: 'unpaid', subtotal: 23.18, tax_amount: 2.32,
        discount_amount: 0, notes: null, locked_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        table: { id: 'table-1', table_number: 5, capacity: 4 },
        order_items: []
      },
      {
        id: '2', order_number: 'KOT002', order_status: 'SENT_TO_KITCHEN',
        total_amount: 45.75, branch_id: '', table_id: null, created_by: null,
        payment_status: 'unpaid', subtotal: 41.59, tax_amount: 4.16,
        discount_amount: 0, notes: null, locked_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        order_items: []
      },
      {
        id: '3', order_number: 'KOT003', order_status: 'SERVED',
        total_amount: 18.90, branch_id: '', table_id: 'table-2', created_by: null,
        payment_status: 'unpaid', subtotal: 17.18, tax_amount: 1.72,
        discount_amount: 0, notes: null, locked_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        table: { id: 'table-2', table_number: 8, capacity: 6 },
        order_items: []
      },
    ];
    setKots(mockKots);
  }, []);

  const handleEditKOT = (kot: Order) => {
    // TODO: Implement edit functionality - open order in POS for modification
    console.log('Edit KOT:', kot);
    toast({
      title: 'Edit KOT',
      description: `Opening KOT ${kot.order_number} for editing`,
    });
  };

  const handlePrintKOT = async (kot: Order) => {
    setLoading(true);
    try {
      const tableName = kot.table?.table_number ? `Table ${kot.table.table_number}` : 'Takeaway';
      const kotItems = kot.order_items?.map(item => ({
        name: item.menu_item?.name || 'Unknown Item',
        quantity: item.quantity,
        notes: item.notes
      })) || [];

      const success = await printKOT(tableName, kotItems, kot.order_number);
      if (success) {
        toast({
          title: '🖨️ KOT Printed',
          description: `KOT ${kot.order_number} sent to printer`,
        });
      } else {
        toast({
          title: 'Print Failed',
          description: 'Failed to print KOT',
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Today's KOT Orders
            <Badge variant="secondary" className="ml-2">{kots.length} KOTs</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-96">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold">KOT #</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Table/Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {kots.map((kot, index) => (
                  <tr key={kot.id} className={`border-b hover:bg-muted/50 ${index % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-4 py-3 text-sm font-medium">{kot.order_number}</td>
                    <td className="px-4 py-3 text-sm">
                      {kot.table ? `Table ${kot.table.table_number}` : 'Takeaway'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${STATUS_COLORS[kot.order_status]} text-xs`}>
                        {kot.order_status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {format(new Date(kot.created_at), 'HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditKOT(kot)}
                          className="h-8 px-2"
                          disabled={loading}
                        >
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintKOT(kot)}
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}