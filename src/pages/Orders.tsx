import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Send, Check, Receipt, CreditCard, Banknote, Smartphone, Wifi, Printer, Search, CalendarIcon, X, User } from 'lucide-react';
import { getOrders, sendToKitchen, markAsServed, requestBill, searchOrders } from '@/services/orderService';
import { finalizePayment } from '@/services/paymentService';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import ReceiptDialog from '@/components/ReceiptDialog';
import type { Order, OrderStatus, PaymentMethod } from '@/types/pos';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<OrderStatus, string> = {
  CREATED: 'bg-blue-500 text-white',
  SENT_TO_KITCHEN: 'bg-yellow-500 text-black',
  SERVED: 'bg-green-500 text-white',
  BILL_REQUESTED: 'bg-purple-500 text-white',
  PAID: 'bg-emerald-600 text-white',
  CLOSED: 'bg-gray-500 text-white',
};

export default function Orders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [transactionRef, setTransactionRef] = useState('');
  
  // Search filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isSearching, setIsSearching] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const data = await getOrders();
      setOrders(data);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime subscription
  useOrdersRealtime(
    useCallback(() => {
      console.log('New order received');
      loadOrders();
    }, [loadOrders]),
    useCallback(() => {
      console.log('Order updated');
      loadOrders();
    }, [loadOrders]),
    useCallback((deletedId: string) => {
      setOrders(prev => prev.filter(o => o.id !== deletedId));
    }, [])
  );

  async function handleSearch() {
    if (!searchTerm && !startDate && !endDate) {
      loadOrders();
      setIsSearching(false);
      return;
    }
    
    setLoading(true);
    setIsSearching(true);
    try {
      const data = await searchOrders({
        searchTerm: searchTerm || undefined,
        startDate,
        endDate,
      });
      setOrders(data);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Search Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setSearchTerm('');
    setStartDate(undefined);
    setEndDate(undefined);
    setIsSearching(false);
    loadOrders();
  }

  async function handleStatusUpdate(order: Order, action: 'kitchen' | 'served' | 'bill') {
    setLoading(true);
    try {
      if (action === 'kitchen') await sendToKitchen(order.id);
      else if (action === 'served') await markAsServed(order.id);
      else if (action === 'bill') await requestBill(order.id);
      toast({ title: 'Status Updated' });
      loadOrders();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  function openPaymentDialog(order: Order) {
    setSelectedOrder(order);
    setShowPaymentDialog(true);
  }

  function openReceiptDialog(order: Order) {
    setReceiptOrder(order);
    setShowReceiptDialog(true);
  }

  async function handleProcessPayment() {
    if (!selectedOrder) return;
    setLoading(true);
    try {
      const ref = paymentMethod !== 'cash' ? transactionRef : undefined;
      await finalizePayment(selectedOrder.id, Number(selectedOrder.total_amount), paymentMethod, ref);
      setShowPaymentDialog(false);
      
      // Show receipt after payment
      setReceiptOrder(selectedOrder);
      setShowReceiptDialog(true);
      
      setSelectedOrder(null);
      toast({ title: 'Payment Successful!' });
      loadOrders();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  const activeOrders = orders.filter(o => !['PAID', 'CLOSED'].includes(o.order_status));
  const completedOrders = orders.filter(o => ['PAID', 'CLOSED'].includes(o.order_status));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <h1 className="font-bold text-lg">Orders</h1>
        <div className="flex items-center gap-1.5 ml-2">
          <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>
        <Button className="ml-auto" asChild>
          <Link to="/new-order">New Order</Link>
        </Button>
      </header>

      <main className="p-6">
        <Tabs defaultValue="active">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
            </TabsList>
            
            {/* Search Controls */}
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-56"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(startDate && 'text-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM dd') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(endDate && 'text-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'MMM dd') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Button size="sm" onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4" />
              </Button>
              
              {isSearching && (
                <Button size="sm" variant="ghost" onClick={clearSearch}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="active" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeOrders.map(order => (
                <Card key={order.id} className="relative">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex flex-col">
                        <span className="font-bold">{(order as any).table?.table_number || 'Takeaway'}</span>
                        {(order as any).customer_name && (
                          <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {(order as any).customer_name}
                          </span>
                        )}
                      </div>
                      <Badge className={STATUS_COLORS[order.order_status]}>
                        {order.order_status.replace('_', ' ')}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Order Items Preview */}
                    <div className="space-y-1">
                      {((order as any).order_items || []).slice(0, 3).map((item: any) => (
                        <div key={item.id} className="text-sm flex justify-between">
                          <span>{item.quantity}x {item.menu_item?.name || 'Item'}</span>
                          <span className="text-muted-foreground">${Number(item.total_price).toFixed(2)}</span>
                        </div>
                      ))}
                      {((order as any).order_items || []).length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{((order as any).order_items || []).length - 3} more items
                        </p>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-bold">Total</span>
                      <span className="font-bold text-lg">${Number(order.total_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {order.order_status === 'CREATED' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(order, 'kitchen')} disabled={loading}>
                          <Send className="h-3 w-3 mr-1" />Kitchen
                        </Button>
                      )}
                      {order.order_status === 'SENT_TO_KITCHEN' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(order, 'served')} disabled={loading}>
                          <Check className="h-3 w-3 mr-1" />Served
                        </Button>
                      )}
                      {order.order_status === 'SERVED' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(order, 'bill')} disabled={loading}>
                          <Receipt className="h-3 w-3 mr-1" />Bill
                        </Button>
                      )}
                      {order.order_status === 'BILL_REQUESTED' && (
                        <>
                          <Button size="sm" onClick={() => openPaymentDialog(order)} disabled={loading}>
                            <CreditCard className="h-3 w-3 mr-1" />Pay
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openReceiptDialog(order)}>
                            <Printer className="h-3 w-3 mr-1" />Preview
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {activeOrders.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">No active orders</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedOrders.slice(0, 20).map(order => (
                <Card key={order.id} className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex flex-col">
                        <span className="font-bold">{(order as any).table?.table_number || 'Takeaway'}</span>
                        {(order as any).customer_name && (
                          <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {(order as any).customer_name}
                          </span>
                        )}
                      </div>
                      <Badge className={STATUS_COLORS[order.order_status]}>
                        {order.order_status}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="font-bold text-lg">
                      ${Number(order.total_amount).toFixed(2)}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openReceiptDialog(order)}>
                      <Printer className="h-3 w-3 mr-1" />Receipt
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment - ${selectedOrder ? Number(selectedOrder.total_amount).toFixed(2) : '0.00'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { method: 'cash' as PaymentMethod, icon: Banknote, label: 'Cash' },
                { method: 'card' as PaymentMethod, icon: CreditCard, label: 'Card' },
                { method: 'mobile' as PaymentMethod, icon: Smartphone, label: 'Mobile' },
              ].map(({ method, icon: Icon, label }) => (
                <Button
                  key={method}
                  variant={paymentMethod === method ? 'default' : 'outline'}
                  className="h-20 flex-col gap-2"
                  onClick={() => setPaymentMethod(method)}
                >
                  <Icon className="h-6 w-6" />{label}
                </Button>
              ))}
            </div>
            {paymentMethod !== 'cash' && (
              <Input placeholder="Transaction Reference" value={transactionRef} onChange={e => setTransactionRef(e.target.value)} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handleProcessPayment} disabled={loading || (paymentMethod !== 'cash' && !transactionRef)}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <ReceiptDialog 
        open={showReceiptDialog} 
        onOpenChange={setShowReceiptDialog} 
        order={receiptOrder} 
      />
    </div>
  );
}
