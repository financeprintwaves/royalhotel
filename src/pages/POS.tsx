import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Plus, Minus, Trash2, Send, CreditCard, Banknote, 
  Smartphone, User, ChefHat, ShoppingCart, LayoutGrid, ClipboardList,
  Wifi, Clock, Check, Receipt
} from 'lucide-react';
import { getTables } from '@/services/tableService';
import { getAllBranches } from '@/services/staffService';
import { getCategories, getMenuItems } from '@/services/menuService';
import { 
  createOrder, addOrderItem, sendToKitchen, getOrder, getOrders, getKitchenOrders, 
  markAsServed, requestBill, searchOrders
} from '@/services/orderService';
import { finalizePayment, processSplitPayment } from '@/services/paymentService';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { supabase } from '@/integrations/supabase/client';
import ReceiptDialog from '@/components/ReceiptDialog';
import ServingSelectionDialog from '@/components/ServingSelectionDialog';
import type { RestaurantTable, Category, MenuItem, Order, CartItem, PaymentMethod, Branch } from '@/types/pos';

type OrderType = 'dine-in' | 'take-out' | 'delivery';
type ViewType = 'floor' | 'menu' | 'orders' | 'kitchen';

const TABLE_STATUS_COLORS: Record<string, string> = {
  available: 'border-green-500 bg-green-500/10',
  occupied: 'border-orange-500 bg-orange-500/10',
  reserved: 'border-blue-500 bg-blue-500/10',
  cleaning: 'border-yellow-500 bg-yellow-500/10',
};

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-gray-500',
  SENT_TO_KITCHEN: 'bg-yellow-500',
  SERVED: 'bg-blue-500',
  BILL_REQUESTED: 'bg-orange-500',
  PAID: 'bg-green-500',
  CLOSED: 'bg-muted',
};

export default function POS() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Core POS state
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [existingOrder, setExistingOrder] = useState<Order | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  
  // Split payment state
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitCardAmount, setSplitCardAmount] = useState('');
  const [splitMobileAmount, setSplitMobileAmount] = useState('');
  const [mobileTransactionRef, setMobileTransactionRef] = useState('');
  const [view, setView] = useState<ViewType>('floor');
  const [customerName, setCustomerName] = useState('');
  
  // Branch state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  
  // Orders view state
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersTab, setOrdersTab] = useState<'active' | 'completed'>('active');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  
  // Kitchen view state
  const [kitchenOrders, setKitchenOrders] = useState<Order[]>([]);

  // Serving selection dialog state
  const [showServingDialog, setShowServingDialog] = useState(false);
  const [selectedServingItem, setSelectedServingItem] = useState<MenuItem | null>(null);

  // Load initial data
  useEffect(() => {
    loadBranches();
    loadCategories();
    loadMenuItems();
  }, []);

  // Load tables when branch changes
  useEffect(() => {
    loadTables();
  }, [selectedBranch]);

  async function loadBranches() {
    try {
      const data = await getAllBranches();
      setBranches(data);
      // Set default branch from user profile or first branch
      if (data.length > 0 && !selectedBranch) {
        setSelectedBranch(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  }

  async function loadTables() {
    try {
      const data = await getTables(selectedBranch || undefined);
      setTables(data);
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  }

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  async function loadMenuItems() {
    try {
      const data = await getMenuItems();
      setMenuItems(data);
    } catch (error) {
      console.error('Failed to load menu items:', error);
    }
  }

  // Orders view functions
  const loadAllOrders = useCallback(async () => {
    try {
      const data = await getOrders();
      setAllOrders(data);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setIsConnected(false);
    }
  }, []);

  // Kitchen view functions  
  const loadKitchenOrders = useCallback(async () => {
    try {
      const data = await getKitchenOrders();
      setKitchenOrders(data);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to load kitchen orders:', error);
      setIsConnected(false);
    }
  }, []);

  // Load orders data when view changes
  useEffect(() => {
    if (view === 'orders') {
      loadAllOrders();
    } else if (view === 'kitchen') {
      loadKitchenOrders();
    }
  }, [view, loadAllOrders, loadKitchenOrders]);

  // Realtime subscription for orders
  useOrdersRealtime(
    useCallback(() => {
      if (view === 'orders') loadAllOrders();
      if (view === 'kitchen') {
        loadKitchenOrders();
        toast({ title: 'New Order!', description: 'A new order has arrived' });
      }
    }, [view, loadAllOrders, loadKitchenOrders, toast]),
    useCallback(() => {
      if (view === 'orders') loadAllOrders();
      if (view === 'kitchen') loadKitchenOrders();
    }, [view, loadAllOrders, loadKitchenOrders]),
    useCallback((deletedId: string) => {
      setAllOrders(prev => prev.filter(o => o.id !== deletedId));
      setKitchenOrders(prev => prev.filter(o => o.id !== deletedId));
    }, [])
  );

  // Check if table has existing order
  async function checkExistingOrder(tableId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          table:restaurant_tables(id, table_number, capacity),
          order_items(
            *,
            menu_item:menu_items(id, name, price, image_url)
          )
        `)
        .eq('table_id', tableId)
        .in('order_status', ['CREATED', 'SENT_TO_KITCHEN', 'SERVED', 'BILL_REQUESTED'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as Order | null;
    } catch (error) {
      console.error('Error checking existing order:', error);
      return null;
    }
  }

  async function handleSelectTable(table: RestaurantTable) {
    setSelectedTable(table);
    setView('menu');
    
    const existing = await checkExistingOrder(table.id);
    if (existing) {
      setExistingOrder(existing);
      toast({ 
        title: 'Existing Order Found', 
        description: `Table ${table.table_number} has an active order. You can add more items.` 
      });
    } else {
      setExistingOrder(null);
    }
  }

  function handleTakeout() {
    setSelectedTable(null);
    setExistingOrder(null);
    setOrderType('take-out');
    setView('menu');
  }

  // Handle menu item click - check if serving selection needed
  function handleMenuItemClick(item: MenuItem) {
    if (!item.is_available) return;
    
    // If item is by_serving type, show selection dialog
    if (item.billing_type === 'by_serving' && item.serving_price) {
      setSelectedServingItem(item);
      setShowServingDialog(true);
    } else {
      // For bottle_only or service items, add directly
      addToCart(item, false);
    }
  }

  // Add item to cart with serving type consideration
  function addToCart(item: MenuItem, isServing: boolean = false) {
    const price = isServing ? (item.serving_price || item.price) : item.price;
    const cartKey = `${item.id}-${isServing ? 'serving' : 'bottle'}`;
    
    setCart(prev => {
      // Find existing cart item with same id AND same serving type
      const existingIndex = prev.findIndex(c => 
        c.menuItem.id === item.id && c.isServing === isServing
      );
      
      if (existingIndex >= 0) {
        return prev.map((c, i) => 
          i === existingIndex ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { 
        menuItem: { ...item, price }, // Override price based on serving type
        quantity: 1, 
        isServing 
      }];
    });
  }

  // Handle serving selection from dialog
  function handleServingSelect(item: MenuItem, isServing: boolean) {
    addToCart(item, isServing);
  }

  function updateCartQuantity(itemId: string, isServing: boolean | undefined, delta: number) {
    setCart(prev => prev.map(c => {
      if (c.menuItem.id === itemId && c.isServing === isServing) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : c;
      }
      return c;
    }).filter(c => c.quantity > 0));
  }

  function removeFromCart(itemId: string, isServing: boolean | undefined) {
    setCart(prev => prev.filter(c => !(c.menuItem.id === itemId && c.isServing === isServing)));
  }

  const [discount, setDiscount] = useState<number>(0);
  
  const subtotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
  const total = subtotal - discount;
  const existingTotal = existingOrder?.total_amount ? Number(existingOrder.total_amount) : 0;
  const grandTotal = existingTotal + total;

  async function handleSendToKitchen() {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Cart is empty', description: 'Add items before sending to kitchen' });
      return;
    }

    setLoading(true);
    try {
      let orderId: string;
      
      if (existingOrder) {
        orderId = existingOrder.id;
        for (const item of cart) {
          await addOrderItem(orderId, item.menuItem, item.quantity, item.notes);
        }
        
        if (existingOrder.order_status !== 'CREATED' && existingOrder.order_status !== 'SENT_TO_KITCHEN') {
          await supabase
            .from('orders')
            .update({ order_status: 'SENT_TO_KITCHEN', updated_at: new Date().toISOString() })
            .eq('id', orderId);
        } else if (existingOrder.order_status === 'CREATED') {
          await sendToKitchen(orderId);
        }
        
        toast({ 
          title: 'Items Added!', 
          description: `${cart.length} items sent to kitchen for ${selectedTable?.table_number || 'Takeaway'}` 
        });
      } else {
        const newOrder = await createOrder(selectedTable?.id || null, customerName || undefined);
        orderId = newOrder.id;
        
        for (const item of cart) {
          await addOrderItem(orderId, item.menuItem, item.quantity, item.notes);
        }
        
        await sendToKitchen(orderId);
        toast({ 
          title: 'Order Sent!', 
          description: `Order for ${selectedTable?.table_number || 'Takeaway'} sent to kitchen` 
        });
      }
      
      setCart([]);
      setExistingOrder(null);
      setSelectedTable(null);
      setCustomerName('');
      setView('floor');
      loadTables();
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handlePayNow() {
    if (cart.length === 0 && !existingOrder) {
      toast({ variant: 'destructive', title: 'Nothing to pay', description: 'Add items or select a table with an order' });
      return;
    }
    setShowPaymentDialog(true);
  }

  async function handleProcessPayment() {
    setLoading(true);
    try {
      let orderId: string;
      let paymentTotal = grandTotal;
      
      if (existingOrder) {
        orderId = existingOrder.id;
        
        if (cart.length > 0) {
          for (const item of cart) {
            await addOrderItem(orderId, item.menuItem, item.quantity, item.notes);
          }
        }
        
        const updatedOrder = await getOrder(orderId);
        paymentTotal = Number(updatedOrder?.total_amount || 0);
        
        if (existingOrder.order_status !== 'BILL_REQUESTED') {
          await supabase.rpc('update_order_status', {
            p_order_id: orderId,
            p_new_status: 'BILL_REQUESTED'
          });
        }
      } else {
        const newOrder = await createOrder(selectedTable?.id || null, customerName || undefined);
        orderId = newOrder.id;
        
        for (const item of cart) {
          await addOrderItem(orderId, item.menuItem, item.quantity, item.notes);
        }
        
        const updatedOrder = await getOrder(orderId);
        paymentTotal = Number(updatedOrder?.total_amount || 0);
        
        await sendToKitchen(orderId);
        await supabase.rpc('update_order_status', { p_order_id: orderId, p_new_status: 'SERVED' });
        await supabase.rpc('update_order_status', { p_order_id: orderId, p_new_status: 'BILL_REQUESTED' });
      }
      
      const ref = paymentMethod !== 'cash' ? transactionRef : undefined;
      await finalizePayment(orderId, paymentTotal, paymentMethod, ref);
      
      setShowPaymentDialog(false);
      toast({ 
        title: 'Payment Successful!', 
        description: `${paymentTotal.toFixed(3)} OMR received via ${paymentMethod}` 
      });
      
      setCart([]);
      setExistingOrder(null);
      setSelectedTable(null);
      setCustomerName('');
      setDiscount(0);
      setView('floor');
      setTransactionRef('');
      loadTables();
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  // Order view handlers
  async function handleOrderStatusUpdate(orderId: string, action: 'kitchen' | 'served' | 'bill') {
    setLoading(true);
    try {
      if (action === 'kitchen') {
        await sendToKitchen(orderId);
        toast({ title: 'Sent to Kitchen' });
      } else if (action === 'served') {
        await markAsServed(orderId);
        toast({ title: 'Marked as Served' });
      } else if (action === 'bill') {
        await requestBill(orderId);
        toast({ title: 'Bill Requested' });
      }
      loadAllOrders();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleOrderPayment(order: Order) {
    setSelectedOrderForPayment(order);
    setShowPaymentDialog(true);
  }

  async function handleProcessOrderPayment() {
    if (!selectedOrderForPayment) return;
    setLoading(true);
    try {
      const paymentTotal = Number(selectedOrderForPayment.total_amount || 0);
      const ref = paymentMethod !== 'cash' ? transactionRef : undefined;
      await finalizePayment(selectedOrderForPayment.id, paymentTotal, paymentMethod, ref);
      
      setShowPaymentDialog(false);
      setSelectedOrderForPayment(null);
      setTransactionRef('');
      toast({ title: 'Payment Successful!', description: `${paymentTotal.toFixed(3)} OMR received` });
      
      // Show receipt
      const updatedOrder = await getOrder(selectedOrderForPayment.id);
      if (updatedOrder) {
        setReceiptOrder(updatedOrder);
        setShowReceiptDialog(true);
      }
      
      loadAllOrders();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  // Kitchen view handlers
  async function handleMarkServed(orderId: string) {
    setLoading(true);
    try {
      await markAsServed(orderId);
      toast({ title: 'Order Served!' });
      setKitchenOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      loadKitchenOrders();
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = selectedCategory
    ? menuItems.filter(i => i.category_id === selectedCategory)
    : menuItems;

  const activeOrders = allOrders.filter(o => !['PAID', 'CLOSED'].includes(o.order_status));
  const completedOrders = allOrders.filter(o => ['PAID', 'CLOSED'].includes(o.order_status));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-card px-4 py-2 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          <h1 className="font-bold text-lg">POS</h1>
          <div className="flex gap-2 ml-4">
            <Button 
              variant={view === 'floor' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setView('floor')}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Floor
            </Button>
            <Button 
              variant={view === 'menu' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setView('menu')}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Menu
            </Button>
            <Button 
              variant={view === 'orders' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setView('orders')}
            >
              <ClipboardList className="h-4 w-4 mr-1" />
              Orders
            </Button>
            <Button 
              variant={view === 'kitchen' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setView('kitchen')}
            >
              <ChefHat className="h-4 w-4 mr-1" />
              Kitchen
            </Button>
          </div>
          {selectedTable && (
            <Badge variant="secondary" className="ml-2">
              {selectedTable.table_number}
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </header>

        {/* Floor View */}
        {view === 'floor' && (
          <main className="flex-1 p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                FLOOR STATUS
              </h2>
              <div className="flex items-center gap-4">
                {/* Branch Selector */}
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> FREE
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500" /> ACTIVE
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> RESERVED
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tables.map(table => (
                <Card
                  key={table.id}
                  className={`cursor-pointer transition-all hover:shadow-lg border-2 ${TABLE_STATUS_COLORS[table.status] || 'border-muted'}`}
                  onClick={() => handleSelectTable(table)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-xl font-bold">{table.table_number}</div>
                    <div className="text-xs text-muted-foreground">{table.capacity} seats</div>
                    <Badge variant="outline" className="mt-2 text-xs capitalize">
                      {table.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              
              <Card
                className="cursor-pointer transition-all hover:shadow-lg border-2 border-dashed border-muted-foreground/30"
                onClick={handleTakeout}
              >
                <CardContent className="p-4 text-center">
                  <User className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-medium">Takeaway</div>
                </CardContent>
              </Card>
            </div>
          </main>
        )}

        {/* Menu View */}
        {view === 'menu' && (
          <div className="flex-1 flex overflow-hidden">
            <aside className="w-32 border-r bg-muted/30 p-2 overflow-auto">
              <Button
                variant={selectedCategory === null ? 'default' : 'ghost'}
                className="w-full justify-start text-xs mb-1 h-8"
                onClick={() => setSelectedCategory(null)}
              >
                ALL MENU
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'ghost'}
                  className="w-full justify-start text-xs mb-1 h-8"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name.toUpperCase()}
                </Button>
              ))}
            </aside>

            <main className="flex-1 p-4 overflow-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredItems.map(item => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer hover:shadow-lg transition-all ${!item.is_available ? 'opacity-50' : ''}`}
                    onClick={() => handleMenuItemClick(item)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary text-sm">{item.price.toFixed(3)} OMR</span>
                          {item.billing_type === 'by_serving' && item.serving_price && (
                            <span className="text-xs text-muted-foreground">
                              Shot: {item.serving_price.toFixed(3)}
                            </span>
                          )}
                        </div>
                        {!item.is_available && (
                          <Badge variant="destructive" className="text-xs">Out</Badge>
                        )}
                        {item.billing_type === 'service' && (
                          <Badge variant="outline" className="text-xs">Service</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </main>
          </div>
        )}

        {/* Orders View */}
        {view === 'orders' && (
          <main className="flex-1 p-4 overflow-auto">
            <Tabs value={ordersTab} onValueChange={(v) => setOrdersTab(v as 'active' | 'completed')}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="active" className="mt-0">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeOrders.map(order => (
                    <Card key={order.id} className="border-l-4" style={{ borderLeftColor: STATUS_COLORS[order.order_status]?.replace('bg-', '') }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>{(order as any).table?.table_number || 'Takeaway'}</span>
                          <Badge className={STATUS_COLORS[order.order_status]}>{order.order_status}</Badge>
                        </CardTitle>
                        {(order as any).customer_name && (
                          <p className="text-sm text-muted-foreground">{(order as any).customer_name}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm space-y-1">
                          {((order as any).order_items || []).slice(0, 3).map((item: any) => (
                            <div key={item.id} className="flex justify-between">
                              <span>{item.quantity}x {item.menu_item?.name || 'Item'}</span>
                            </div>
                          ))}
                          {((order as any).order_items || []).length > 3 && (
                            <p className="text-muted-foreground">+{((order as any).order_items || []).length - 3} more</p>
                          )}
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>{Number(order.total_amount || 0).toFixed(3)} OMR</span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          {order.order_status === 'CREATED' && (
                            <Button size="sm" className="flex-1" onClick={() => handleOrderStatusUpdate(order.id, 'kitchen')}>
                              <Send className="h-3 w-3 mr-1" />Kitchen
                            </Button>
                          )}
                          {order.order_status === 'SENT_TO_KITCHEN' && (
                            <Button size="sm" className="flex-1" onClick={() => handleOrderStatusUpdate(order.id, 'served')}>
                              <Check className="h-3 w-3 mr-1" />Served
                            </Button>
                          )}
                          {order.order_status === 'SERVED' && (
                            <Button size="sm" className="flex-1" onClick={() => handleOrderStatusUpdate(order.id, 'bill')}>
                              <Receipt className="h-3 w-3 mr-1" />Bill
                            </Button>
                          )}
                          {order.order_status === 'BILL_REQUESTED' && (
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleOrderPayment(order)}>
                              <CreditCard className="h-3 w-3 mr-1" />Pay
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {activeOrders.length === 0 && (
                    <Card className="col-span-full">
                      <CardContent className="py-12 text-center">
                        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No active orders</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed" className="mt-0">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {completedOrders.slice(0, 20).map(order => (
                    <Card key={order.id} className="opacity-75">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>{(order as any).table?.table_number || 'Takeaway'}</span>
                          <Badge className="bg-green-500">PAID</Badge>
                        </CardTitle>
                        {(order as any).customer_name && (
                          <p className="text-sm text-muted-foreground">{(order as any).customer_name}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>{Number(order.total_amount || 0).toFixed(3)} OMR</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                  {completedOrders.length === 0 && (
                    <Card className="col-span-full">
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">No completed orders yet</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </main>
        )}

        {/* Kitchen View */}
        {view === 'kitchen' && (
          <main className="flex-1 p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Kitchen Display</h2>
              </div>
              <Badge variant="secondary">{kitchenOrders.length} orders</Badge>
            </div>

            {kitchenOrders.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No orders in queue</p>
                  <p className="text-sm text-muted-foreground">New orders will appear here automatically</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {kitchenOrders.map(order => (
                  <Card key={order.id} className="border-2 border-yellow-500/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span>{(order as any).table?.table_number || 'Takeaway'}</span>
                        <Badge className="bg-yellow-500">{order.order_status}</Badge>
                      </CardTitle>
                      {(order as any).customer_name && (
                        <p className="text-sm text-muted-foreground">{(order as any).customer_name}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        {((order as any).order_items || []).map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="font-medium">{item.quantity}x {item.menu_item?.name || 'Item'}</span>
                            {item.notes && <span className="text-muted-foreground italic">{item.notes}</span>}
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <div className="text-sm bg-muted p-2 rounded">
                          <strong>Note:</strong> {order.notes}
                        </div>
                      )}
                      <Button 
                        className="w-full" 
                        onClick={() => handleMarkServed(order.id)} 
                        disabled={loading}
                      >
                        <Check className="h-4 w-4 mr-2" />Mark as Served
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        )}
      </div>

      {/* Right Sidebar - Current Order (only show for floor/menu views) */}
      {(view === 'floor' || view === 'menu') && (
        <aside className="w-80 border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <ShoppingCart className="h-5 w-5" />
              Current Order
            </div>
            {selectedTable && (
              <div className="text-sm text-muted-foreground mt-1">
                {selectedTable.table_number}
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-b">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Name</label>
            <Input
              placeholder="Enter customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="px-4 py-3 border-b">
            <div className="grid grid-cols-3 gap-1">
              {(['dine-in', 'take-out', 'delivery'] as OrderType[]).map(type => (
                <Button
                  key={type}
                  variant={orderType === type ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs capitalize"
                  onClick={() => setOrderType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {existingOrder && existingOrder.order_items && existingOrder.order_items.length > 0 && (
            <div className="px-4 py-2 bg-muted/50 border-b">
              <div className="text-xs font-medium text-muted-foreground mb-2">Previous Items</div>
              {existingOrder.order_items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-xs py-1 opacity-70">
                  <span>{item.quantity}x {item.menu_item?.name || 'Item'}</span>
                  <span>{Number(item.total_price).toFixed(3)} OMR</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between text-xs font-medium">
                <span>Previous Total</span>
                <span>{existingTotal.toFixed(3)} OMR</span>
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">TICKET IS EMPTY</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div key={`${item.menuItem.id}-${item.isServing ? 'serving' : 'bottle'}-${idx}`} className="flex items-center gap-2 bg-muted/50 rounded p-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.menuItem.name}
                        {item.isServing && <span className="text-xs ml-1 text-muted-foreground">(Shot)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.menuItem.price.toFixed(3)} OMR × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6" 
                        onClick={() => updateCartQuantity(item.menuItem.id, item.isServing, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6" 
                        onClick={() => updateCartQuantity(item.menuItem.id, item.isServing, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-destructive" 
                        onClick={() => removeFromCart(item.menuItem.id, item.isServing)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t">
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">CUSTOMER</div>
                <div className="text-sm font-medium">{customerName || 'Guest'}</div>
              </div>
            </div>
            
            <div className="px-4 py-3 space-y-2 text-sm">
              {cart.length > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(3)} OMR</span>
                </div>
              )}
              {existingOrder && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Previous Order</span>
                  <span>{existingTotal.toFixed(3)} OMR</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Discount</span>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-28 h-7 text-sm text-right"
                />
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-500">
                  <span>Discount Applied</span>
                  <span>-{discount.toFixed(3)} OMR</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{grandTotal.toFixed(3)} OMR</span>
              </div>
            </div>

            <div className="p-4 grid grid-cols-2 gap-2">
              <Button 
                variant="secondary" 
                size="lg"
                className="flex items-center gap-2"
                onClick={handleSendToKitchen}
                disabled={cart.length === 0 || loading}
              >
                <ChefHat className="h-4 w-4" />
                KITCHEN
              </Button>
              <Button 
                size="lg"
                className="flex items-center gap-2 bg-primary"
                onClick={handlePayNow}
                disabled={(cart.length === 0 && !existingOrder) || loading}
              >
                <CreditCard className="h-4 w-4" />
                PAY NOW
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
        setShowPaymentDialog(open);
        if (!open) {
          setIsSplitPayment(false);
          setSplitCashAmount('');
          setSplitCardAmount('');
          setSplitMobileAmount('');
          setMobileTransactionRef('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Process Payment - {selectedOrderForPayment 
                ? Number(selectedOrderForPayment.total_amount || 0).toFixed(3) 
                : grandTotal.toFixed(3)} OMR
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Payment Method Toggle */}
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant={!isSplitPayment ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsSplitPayment(false)}
              >
                Single Payment
              </Button>
              <Button
                variant={isSplitPayment ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsSplitPayment(true)}
              >
                Split Payment
              </Button>
            </div>

            {!isSplitPayment ? (
              <>
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
                      <Icon className="h-6 w-6" />
                      {label}
                    </Button>
                  ))}
                </div>
                {paymentMethod !== 'cash' && (
                  <Input
                    placeholder="Transaction Reference"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                  />
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Banknote className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <Label className="text-sm">Cash Amount (OMR)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.000"
                      value={splitCashAmount}
                      onChange={e => setSplitCashAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <Label className="text-sm">Card Amount (OMR)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.000"
                      value={splitCardAmount}
                      onChange={e => setSplitCardAmount(e.target.value)}
                    />
                  </div>
                </div>
                {Number(splitCardAmount) > 0 && (
                  <Input
                    placeholder="Card Transaction Reference"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                  />
                )}
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                  <div className="flex-1">
                    <Label className="text-sm">Mobile Amount (OMR)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.000"
                      value={splitMobileAmount}
                      onChange={e => setSplitMobileAmount(e.target.value)}
                    />
                  </div>
                </div>
                {Number(splitMobileAmount) > 0 && (
                  <Input
                    placeholder="Mobile Transaction Reference"
                    value={mobileTransactionRef}
                    onChange={e => setMobileTransactionRef(e.target.value)}
                  />
                )}
                <Separator />
                <div className="text-sm font-medium">
                  Total: {(Number(splitCashAmount || 0) + Number(splitCardAmount || 0) + Number(splitMobileAmount || 0)).toFixed(3)} OMR
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPaymentDialog(false);
              setSelectedOrderForPayment(null);
              setIsSplitPayment(false);
              setSplitCashAmount('');
              setSplitCardAmount('');
              setSplitMobileAmount('');
              setMobileTransactionRef('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                const orderTotal = selectedOrderForPayment 
                  ? Number(selectedOrderForPayment.total_amount || 0) 
                  : grandTotal;
                
                if (isSplitPayment) {
                  const cashAmt = Number(splitCashAmount || 0);
                  const cardAmt = Number(splitCardAmount || 0);
                  const mobileAmt = Number(splitMobileAmount || 0);
                  const splitTotal = cashAmt + cardAmt + mobileAmt;
                  
                  if (splitTotal < orderTotal) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Split amounts must cover the total' });
                    return;
                  }
                  
                  // Validate transaction references
                  if (cardAmt > 0 && !transactionRef) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Card transaction reference required' });
                    return;
                  }
                  if (mobileAmt > 0 && !mobileTransactionRef) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Mobile transaction reference required' });
                    return;
                  }
                  
                  const orderId = selectedOrderForPayment?.id;
                  if (!orderId) {
                    toast({ variant: 'destructive', title: 'Error', description: 'No order selected' });
                    return;
                  }
                  
                  setLoading(true);
                  try {
                    const payments: { amount: number; payment_method: PaymentMethod }[] = [];
                    if (cashAmt > 0) payments.push({ amount: cashAmt, payment_method: 'cash' });
                    if (cardAmt > 0) payments.push({ amount: cardAmt, payment_method: 'card' });
                    if (mobileAmt > 0) payments.push({ amount: mobileAmt, payment_method: 'mobile' });
                    
                    await processSplitPayment(orderId, payments);
                    
                    setShowPaymentDialog(false);
                    setSelectedOrderForPayment(null);
                    setIsSplitPayment(false);
                    setSplitCashAmount('');
                    setSplitCardAmount('');
                    setSplitMobileAmount('');
                    setMobileTransactionRef('');
                    
                    const parts = [];
                    if (cashAmt > 0) parts.push(`Cash: ${cashAmt.toFixed(3)}`);
                    if (cardAmt > 0) parts.push(`Card: ${cardAmt.toFixed(3)}`);
                    if (mobileAmt > 0) parts.push(`Mobile: ${mobileAmt.toFixed(3)}`);
                    toast({ title: 'Split Payment Successful!', description: `${parts.join(' + ')} OMR` });
                    loadAllOrders();
                  } catch (error: any) {
                    toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
                  } finally {
                    setLoading(false);
                  }
                } else {
                  selectedOrderForPayment ? handleProcessOrderPayment() : handleProcessPayment();
                }
              }}
              disabled={loading || (!isSplitPayment && paymentMethod !== 'cash' && !transactionRef)}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {receiptOrder && (
        <ReceiptDialog
          order={receiptOrder}
          open={showReceiptDialog}
          onOpenChange={setShowReceiptDialog}
        />
      )}

      {/* Serving Selection Dialog */}
      <ServingSelectionDialog
        open={showServingDialog}
        onOpenChange={setShowServingDialog}
        item={selectedServingItem}
        onSelect={handleServingSelect}
      />
    </div>
  );
}
