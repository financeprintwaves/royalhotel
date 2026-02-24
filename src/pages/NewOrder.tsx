import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Minus, Trash2, Send, CreditCard, Banknote, Smartphone, Users } from 'lucide-react';
import { getTables } from '@/services/tableService';
import { getCategories, getMenuItems } from '@/services/menuService';
import { createOrder, addOrderItem, sendToKitchen, requestBill, getOrder } from '@/services/orderService';
import { finalizePayment } from '@/services/paymentService';
import ReceiptDialog from '@/components/ReceiptDialog';
import type { RestaurantTable, Category, MenuItem, Order, CartItem, PaymentMethod } from '@/types/pos';

type Step = 'table' | 'menu' | 'cart' | 'payment';

export default function NewOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [step, setStep] = useState<Step>('table');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');

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
      if (data.length > 0) setSelectedCategory(data[0].id);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  async function loadMenuItems(categoryId?: string) {
    try {
      const data = await getMenuItems(categoryId);
      setMenuItems(data);
    } catch (error) {
      console.error('Failed to load menu items:', error);
    }
  }

  function handleSelectTable(table: RestaurantTable) {
    setSelectedTable(table);
    setStep('menu');
  }

  function handleSkipTable() {
    setSelectedTable(null);
    setStep('menu');
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
  const total = subtotal; // Prices include tax

  async function handleCreateOrder() {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Cart is empty', description: 'Add items before creating order' });
      return;
    }

    setLoading(true);
    try {
      const newOrder = await createOrder(selectedTable?.id || null);
      
      for (const item of cart) {
        await addOrderItem(newOrder.id, item.menuItem, item.quantity, item.notes);
      }
      
      setOrder(newOrder);
      setStep('cart');
      toast({ title: 'Order created!', description: `Order for ${selectedTable?.table_number || 'Takeaway'} created` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to create order', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSendToKitchen() {
    if (!order) return;
    setLoading(true);
    try {
      await sendToKitchen(order.id);
      toast({ title: 'Sent to Kitchen!', description: 'Order has been sent to the kitchen' });
      navigate('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestBillAndPay() {
    if (!order) return;
    setLoading(true);
    try {
      await requestBill(order.id);
      setShowPaymentDialog(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  // For takeaway: execute order and print bill immediately, then go to Orders page for payment
  async function handleExecuteAndGetBill() {
    if (!order) return;
    setLoading(true);
    try {
      // Request bill (prepares order for payment and generates order_number)
      await requestBill(order.id);
      
      // Refresh order to get the newly generated order_number
      const updatedOrder = await getOrder(order.id);
      if (updatedOrder) {
        setOrder(updatedOrder);
      }
      
      // Show receipt dialog with autoPrint enabled - bill prints immediately
      setShowReceiptDialog(true);
      
      // Auto-navigate to Orders page after bill is printed (3 seconds delay for printing)
      setTimeout(() => {
        navigate('/');
        toast({ title: 'Takeaway Order Created!', description: 'Bill printed. Please process payment on Orders page.' });
      }, 3000);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessPayment() {
    if (!order) return;
    setLoading(true);
    try {
      const ref = paymentMethod !== 'cash' ? transactionRef : undefined;
      await finalizePayment(order.id, total, paymentMethod, ref);
      
      // Refresh order to ensure we have latest data
      const updatedOrder = await getOrder(order.id);
      if (updatedOrder) {
        setOrder(updatedOrder);
      }
      
      // Show receipt immediately - no delay
      setShowPaymentDialog(false);
      setShowReceiptDialog(true);
      
      // Auto-navigate after receipt dialog closes (after 5 seconds for user to see receipt)
      setTimeout(() => {
        navigate('/');
      }, 5000);
      
      toast({ title: 'Payment Successful!', description: `${total.toFixed(3)} OMR received via ${paymentMethod}` });
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <h1 className="font-bold text-lg">New Order</h1>
        {selectedTable && <Badge variant="outline">{selectedTable.table_number}</Badge>}
        <div className="ml-auto flex gap-2">
          {['table', 'menu', 'cart', 'payment'].map((s, i) => (
            <Badge key={s} variant={step === s ? 'default' : 'secondary'} className="capitalize">
              {i + 1}. {s}
            </Badge>
          ))}
        </div>
      </header>

      {/* Step 1: Table Selection */}
      {step === 'table' && (
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Select a Table</h2>
              <Button variant="outline" onClick={handleSkipTable}>
                <Users className="h-4 w-4 mr-2" />Takeaway / No Table
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tables.map(table => (
                <Card
                  key={table.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    table.status === 'available' ? 'border-green-500/50 hover:border-green-500' :
                    table.status === 'occupied' ? 'border-red-500/50 opacity-60' :
                    'border-yellow-500/50'
                  }`}
                  onClick={() => table.status === 'available' && handleSelectTable(table)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{table.table_number}</div>
                    <div className="text-sm text-muted-foreground">{table.capacity} seats</div>
                    <Badge variant={table.status === 'available' ? 'default' : 'secondary'} className="mt-2 capitalize">
                      {table.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Step 2: Menu Selection */}
      {step === 'menu' && (
        <div className="flex-1 flex">
          {/* Categories Sidebar */}
          <aside className="w-48 border-r bg-muted/30 p-4">
            <h3 className="font-semibold mb-3">Categories</h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </aside>

          {/* Menu Items */}
          <main className="flex-1 p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => item.is_available && addToCart(item)}
                >
                  <CardContent className="p-4">
                    <h4 className="font-semibold truncate">{item.name}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary">{item.price.toFixed(3)} OMR</span>
                      {!item.is_available && <Badge variant="destructive">Unavailable</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>

          {/* Cart Sidebar */}
          <aside className="w-80 border-l bg-card flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Cart ({cart.length})</h3>
            </div>
            <ScrollArea className="flex-1 p-4">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No items in cart</p>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.menuItem.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.menuItem.name}</p>
                        <p className="text-sm text-muted-foreground">{(item.menuItem.price * item.quantity).toFixed(3)} OMR</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateCartQuantity(item.menuItem.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateCartQuantity(item.menuItem.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.menuItem.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-4 border-t space-y-3">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span><span>{total.toFixed(3)} OMR</span>
              </div>
              <Button className="w-full" size="lg" onClick={handleCreateOrder} disabled={cart.length === 0 || loading}>
                Create Order
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Step 3: Order Confirmation */}
      {step === 'cart' && order && (
        <main className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Created</span>
                  <Badge variant="secondary">{selectedTable?.table_number || 'Takeaway'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.menuItem.id} className="flex justify-between">
                      <span>{item.quantity}x {item.menuItem.name}</span>
                      <span>{(item.menuItem.price * item.quantity).toFixed(3)} OMR</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{total.toFixed(3)} OMR</span></div>
                <Separator />
                
                {/* Takeaway flow: Order & Execute (no kitchen, no payment here) */}
                {!selectedTable && (
                  <div>
                    <Button className="w-full" size="lg" onClick={handleExecuteAndGetBill} disabled={loading}>
                      <CreditCard className="h-4 w-4 mr-2" />Order & Execute - Get Bill
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">Bill will print immediately. Payment on Orders page.</p>
                  </div>
                )}
                
                {/* Table flow: Send to Kitchen + Quick Pay */}
                {selectedTable && (
                  <div className="flex gap-4">
                    <Button className="flex-1" onClick={handleSendToKitchen} disabled={loading}>
                      <Send className="h-4 w-4 mr-2" />Send to Kitchen
                    </Button>
                    <Button className="flex-1" variant="secondary" onClick={handleRequestBillAndPay} disabled={loading}>
                      <CreditCard className="h-4 w-4 mr-2" />Quick Pay
                    </Button>
                  </div>
                )}
                
                <div className="mt-3">
                  {/* Invoice / Print before payment (useful for table orders) */}
                  <Button variant="outline" onClick={() => setShowReceiptDialog(true)} disabled={!order} className="w-full">
                    Print Invoice / Issue Receipt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment - {total.toFixed(3)} OMR</DialogTitle>
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
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handleProcessPayment} disabled={loading || (paymentMethod !== 'cash' && !transactionRef)}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog - Shows immediately after payment or execute */}
      <ReceiptDialog 
        open={showReceiptDialog} 
        onOpenChange={setShowReceiptDialog} 
        order={order}
        autoPrint={!selectedTable} // Auto-print for takeaway (when no table selected)
      />
    </div>
  );
}
