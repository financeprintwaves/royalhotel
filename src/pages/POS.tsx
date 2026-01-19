import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  ArrowLeft, Plus, Minus, Trash2, Send, CreditCard, Banknote, 
  Smartphone, User, ChefHat, ShoppingCart, LayoutGrid
} from 'lucide-react';
import { getTables } from '@/services/tableService';
import { getCategories, getMenuItems } from '@/services/menuService';
import { 
  createOrder, addOrderItem, sendToKitchen, getOrder 
} from '@/services/orderService';
import { finalizePayment } from '@/services/paymentService';
import { supabase } from '@/integrations/supabase/client';
import type { RestaurantTable, Category, MenuItem, Order, CartItem, PaymentMethod } from '@/types/pos';

type OrderType = 'dine-in' | 'take-out' | 'delivery';

const TABLE_STATUS_COLORS: Record<string, string> = {
  available: 'border-green-500 bg-green-500/10',
  occupied: 'border-orange-500 bg-orange-500/10',
  reserved: 'border-blue-500 bg-blue-500/10',
  cleaning: 'border-yellow-500 bg-yellow-500/10',
};

export default function POS() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
  const [view, setView] = useState<'floor' | 'menu'>('floor');
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    loadTables();
    loadCategories();
    loadMenuItems();
  }, []);

  async function loadTables() {
    try {
      const data = await getTables();
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
    
    // Check for existing order on this table
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

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }

  function updateCartQuantity(itemId: string, delta: number) {
    setCart(prev => prev.map(c => {
      if (c.menuItem.id === itemId) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : c;
      }
      return c;
    }).filter(c => c.quantity > 0));
  }

  function removeFromCart(itemId: string) {
    setCart(prev => prev.filter(c => c.menuItem.id !== itemId));
  }

  const subtotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
  const taxRate = 0.05; // 5% tax
  const tax = subtotal * taxRate;
  const discount = 0;
  const total = subtotal + tax - discount;

  // Combined total including existing order
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
        // Add items to existing order
        orderId = existingOrder.id;
        for (const item of cart) {
          await addOrderItem(orderId, item.menuItem, item.quantity, item.notes);
        }
        
        // If order was SERVED or later, send back to kitchen for new items
        if (existingOrder.order_status !== 'CREATED' && existingOrder.order_status !== 'SENT_TO_KITCHEN') {
          // Update to SENT_TO_KITCHEN status again
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
        // Create new order with customer name
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
      
      // Clear cart and refresh
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
        
        // Add any new cart items first
        if (cart.length > 0) {
          for (const item of cart) {
            await addOrderItem(orderId, item.menuItem, item.quantity, item.notes);
          }
        }
        
        // Refetch order to get updated total
        const updatedOrder = await getOrder(orderId);
        paymentTotal = Number(updatedOrder?.total_amount || 0);
        
        // If not already at BILL_REQUESTED, update status
        if (existingOrder.order_status !== 'BILL_REQUESTED') {
          await supabase.rpc('update_order_status', {
            p_order_id: orderId,
            p_new_status: 'BILL_REQUESTED'
          });
        }
      } else {
        // Create new order for immediate payment with customer name
        const newOrder = await createOrder(selectedTable?.id || null, customerName || undefined);
        orderId = newOrder.id;
        
        for (const item of cart) {
          await addOrderItem(orderId, item.menuItem, item.quantity, item.notes);
        }
        
        // Get updated total
        const updatedOrder = await getOrder(orderId);
        paymentTotal = Number(updatedOrder?.total_amount || 0);
        
        // Send to kitchen and immediately request bill
        await sendToKitchen(orderId);
        
        // Wait briefly for status to update, then request bill
        await supabase.rpc('update_order_status', {
          p_order_id: orderId,
          p_new_status: 'SERVED'
        });
        
        await supabase.rpc('update_order_status', {
          p_order_id: orderId,
          p_new_status: 'BILL_REQUESTED'
        });
      }
      
      // Process payment
      const ref = paymentMethod !== 'cash' ? transactionRef : undefined;
      await finalizePayment(orderId, paymentTotal, paymentMethod, ref);
      
      setShowPaymentDialog(false);
      toast({ 
        title: 'Payment Successful!', 
        description: `$${paymentTotal.toFixed(2)} received via ${paymentMethod}` 
      });
      
      // Reset state
      setCart([]);
      setExistingOrder(null);
      setSelectedTable(null);
      setCustomerName('');
      setView('floor');
      setTransactionRef('');
      loadTables();
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = selectedCategory
    ? menuItems.filter(i => i.category_id === selectedCategory)
    : menuItems;

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
          </div>
          {selectedTable && (
            <Badge variant="secondary" className="ml-2">
              {selectedTable.table_number}
            </Badge>
          )}
        </header>

        {/* Floor View */}
        {view === 'floor' && (
          <main className="flex-1 p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                FLOOR STATUS
              </h2>
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
                    <Badge 
                      variant="outline" 
                      className="mt-2 text-xs capitalize"
                    >
                      {table.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              
              {/* Takeout Option */}
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
            {/* Categories */}
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

            {/* Menu Items Grid */}
            <main className="flex-1 p-4 overflow-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredItems.map(item => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer hover:shadow-lg transition-all ${!item.is_available ? 'opacity-50' : ''}`}
                    onClick={() => item.is_available && addToCart(item)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary text-sm">${item.price.toFixed(2)}</span>
                        {!item.is_available && (
                          <Badge variant="destructive" className="text-xs">Out</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </main>
          </div>
        )}
      </div>

      {/* Right Sidebar - Current Order */}
      <aside className="w-80 border-l bg-card flex flex-col">
        {/* Order Header */}
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

        {/* Customer Name Input */}
        <div className="px-4 py-3 border-b">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Name</label>
          <Input
            placeholder="Enter customer name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Order Type Toggle */}
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

        {/* Existing Order Items */}
        {existingOrder && existingOrder.order_items && existingOrder.order_items.length > 0 && (
          <div className="px-4 py-2 bg-muted/50 border-b">
            <div className="text-xs font-medium text-muted-foreground mb-2">Previous Items</div>
            {existingOrder.order_items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-xs py-1 opacity-70">
                <span>{item.quantity}x {item.menu_item?.name || 'Item'}</span>
                <span>${Number(item.total_price).toFixed(2)}</span>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between text-xs font-medium">
              <span>Previous Total</span>
              <span>${existingTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">TICKET IS EMPTY</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.menuItem.id} className="flex items-center gap-2 bg-muted/50 rounded p-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.menuItem.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${item.menuItem.price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6" 
                      onClick={() => updateCartQuantity(item.menuItem.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-5 text-center text-sm">{item.quantity}</span>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6" 
                      onClick={() => updateCartQuantity(item.menuItem.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 text-destructive" 
                      onClick={() => removeFromCart(item.menuItem.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Customer & Totals */}
        <div className="border-t">
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">CUSTOMER</div>
              <div className="text-sm font-medium">Guest</div>
            </div>
          </div>
          
          <div className="px-4 py-3 space-y-1 text-sm">
            {cart.length > 0 && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>New Items Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (5%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </>
            )}
            {existingOrder && (
              <div className="flex justify-between text-muted-foreground">
                <span>Previous Order</span>
                <span>${existingTotal.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>DISCOUNT</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment - ${grandTotal.toFixed(2)}</DialogTitle>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleProcessPayment} 
              disabled={loading || (paymentMethod !== 'cash' && !transactionRef)}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
