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
import { getOrders } from '@/services/orderService';
import { useAuth } from '@/contexts/AuthContext';
import { usePOSContext } from '@/contexts/POSContext';

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
  const { profile } = useAuth();
  const { setCartItems, setSelectedTableId, setOrderType, setCurrentOrder } = usePOSContext();

  useEffect(() => {
    const fetchKots = async () => {
      setLoading(true);
      try {
        const fetchedKots = await getOrders(['CREATED', 'SENT_TO_KITCHEN'], 100, profile?.branch_id);
        setKots(fetchedKots);
      } catch (error) {
        console.error('Failed to fetch KOTs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKots();
  }, [profile?.branch_id]);

  const handleEditKOT = (kot: Order) => {
    // Load order into POS for editing
    setCurrentOrder(kot);
    setSelectedTableId(kot.table_id);
    setOrderType(kot.order_type || 'dine-in');
    // Convert order_items to cart items format
    const cartItems = kot.order_items.map(item => ({
      id: item.id,
      menuItem: item.menu_item,
      quantity: item.quantity,
      notes: item.notes || '',
    }));
    setCartItems(cartItems);
    onClose(); // Close the dialog
    toast({
      title: 'Order Loaded',
      description: `Order ${kot.order_number} loaded for editing`,
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