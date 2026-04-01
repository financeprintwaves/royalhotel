import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Plus, Minus, Trash2, Send, CreditCard, Banknote, 
  Smartphone, User, ChefHat, ShoppingCart, LayoutGrid, ClipboardList,
  Wifi, Clock, Check, Receipt, RefreshCw, Lock, Edit, X, Eye, Printer,
  UtensilsCrossed, ImageIcon, Search, Moon, Sun
} from 'lucide-react';
import { 
  createOrder, addOrderItemsBatch, sendToKitchen, getOrders, getKitchenOrders, 
  markAsServed, requestBill, applyDiscount, cancelOrder, updateOrderStatus,
  quickPayOrder, updateOrderItemQuantity, removeOrderItem
} from '@/services/orderService';
import { processSplitPayment } from '@/services/paymentService';
import { mergeTables, splitTables } from '@/services/tableService';
import { printKOT, printInvoice } from '@/services/printerService';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { useCategories, useMenuItems, useTables, useBranches, useRefreshCache } from '@/hooks/useMenuData';
import { supabase } from '@/integrations/supabase/client';
import { saveCartDraft, loadCartDraft, clearCartDraft } from '@/services/localDb';
import ReceiptDialog from '@/components/ReceiptDialog';
import PortionSelectionDialog from '@/components/PortionSelectionDialog';
import NumericKeypad from '@/components/NumericKeypad';
import type { RestaurantTable, Category, MenuItem, Order, CartItem, PaymentMethod, Branch, PortionOption } from '@/types/pos';

// Category color mapping for colorful UI
const CATEGORY_COLORS: Record<string, string> = {
  'Beer': 'bg-amber-500 hover:bg-amber-600 text-white',
  'Whiskey': 'bg-orange-700 hover:bg-orange-800 text-white',
  'Vodka': 'bg-sky-400 hover:bg-sky-500 text-white',
  'Rum': 'bg-amber-800 hover:bg-amber-900 text-white',
  'Gin': 'bg-teal-500 hover:bg-teal-600 text-white',
  'Wine': 'bg-rose-700 hover:bg-rose-800 text-white',
  'Champagne': 'bg-yellow-500 hover:bg-yellow-600 text-black',
  'Soft Drink': 'bg-green-500 hover:bg-green-600 text-white',
  'Tequila': 'bg-lime-600 hover:bg-lime-700 text-white',
  'Service': 'bg-purple-500 hover:bg-purple-600 text-white',
};

type OrderType = 'dine-in' | 'take-out' | 'delivery';
type ViewType = 'tables' | 'menu' | 'orders' | 'kitchen';
export type MenuSession = 'breakfast' | 'lunch' | 'dinner' | 'all';

type HeldBill = {
  id: string;
  name: string;
  table?: RestaurantTable | null;
  orderType: OrderType;
  customerName: string;
  cart: CartItem[];
  discount: number;
  isFOC: boolean;
  session: MenuSession;
  createdAt: string;
};

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
  const { isAdmin, isManagerOrAdmin, profile, roles } = useAuth();
  
  // Core POS state - selectedBranch must be declared before hooks that use it
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  
  // Categories hook (no dependency on later state)
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(selectedBranch || undefined);
  const { refreshTables, refreshMenu } = useRefreshCache();
  
  // Other hooks after selectedBranch is declared
  const { data: branches = [] } = useBranches();
  const { data: tables = [], refetch: refetchTables } = useTables(selectedBranch || undefined);
  
  // Check if user can switch branches (admin only)
  // NOTE: These depend on roles which load asynchronously, so they update when roles load
  const canSwitchBranch = isAdmin();
  const isManagerOrAdminUser = isManagerOrAdmin();
  
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [menuSession, setMenuSession] = useState<MenuSession>('all');
  const { data: menuItems = [], isLoading: menuItemsLoading } = useMenuItems(selectedCategory || undefined, selectedBranch || undefined, { session: menuSession });
  const [quickAddQty, setQuickAddQty] = useState<number>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [existingOrder, setExistingOrder] = useState<Order | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSourceTable, setMergeSourceTable] = useState<RestaurantTable | null>(null);
  const [lastRepeatOrder, setLastRepeatOrder] = useState<Order | null>(null);
  const [timerTick, setTimerTick] = useState<number>(Date.now());
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
  const [view, setView] = useState<ViewType>('tables');
  const [showQuickPay, setShowQuickPay] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  
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
  const [showMobileCart, setShowMobileCart] = useState(false);
  const isMobile = useIsMobile();

  // Numeric keypad state
  const [showNumericKeypad, setShowNumericKeypad] = useState(false);
  const [keypadValue, setKeypadValue] = useState('');
  const [keypadTitle, setKeypadTitle] = useState('');
  const [keypadCallback, setKeypadCallback] = useState<((value: string) => void) | null>(null);

  // Set default branch when branches load - use user's branch for non-admins
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      // For non-admins, lock to their assigned branch
      if (!canSwitchBranch && profile?.branch_id) {
        setSelectedBranch(profile.branch_id);
      } else {
        setSelectedBranch(branches[0].id);
      }
    }
  }, [branches, selectedBranch, canSwitchBranch, profile?.branch_id]);

  // Restore cart + held bills from IndexedDB/localStorage on branch select
  useEffect(() => {
    if (!selectedBranch) return;

    loadCartDraft(selectedBranch).then(saved => {
      if (saved && saved.length > 0) setCart(saved);
    });

    try {
      const savedHeld = localStorage.getItem(`heldBills:${selectedBranch}`);
      if (savedHeld) {
        const parsed = JSON.parse(savedHeld) as HeldBill[];
        if (Array.isArray(parsed)) setHeldBills(parsed);
      }
    } catch {
      // ignore localStorage errors
    }
  }, [selectedBranch]);

  // Auto-save cart to IndexedDB on every change
  useEffect(() => {
    if (selectedBranch) {
      if (cart.length > 0) {
        saveCartDraft(cart, selectedBranch);
      } else {
        clearCartDraft();
      }
    }
  }, [cart, selectedBranch]);

  useEffect(() => {
    if (!selectedBranch) return;
    try {
      localStorage.setItem(`heldBills:${selectedBranch}`, JSON.stringify(heldBills));
    } catch {
      // ignore localStorage write errors
    }
  }, [heldBills, selectedBranch]);

  // Update repeat order from most recent paid order
  useEffect(() => {
    const lastPaid = allOrders.find(o => o.order_status === 'PAID');
    if (lastPaid) setLastRepeatOrder(lastPaid);
  }, [allOrders]);

  // Keyboard shortcuts (F1-F9) for fast billing
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches('input, textarea, [contenteditable=true]')) return;
      switch (event.key) {
        case 'F1':
          event.preventDefault();
          clearCurrentOrder();
          toast({ title: 'New Bill', description: 'Cleared current ticket.' });
          break;
        case 'F2':
          event.preventDefault();
          document.querySelector<HTMLInputElement>('input[placeholder="Search menu items..."]')?.focus();
          break;
        case 'F3':
          event.preventDefault();
          handleHoldBill();
          break;
        case 'F4':
          event.preventDefault();
          setShowHeldBills(true);
          break;
        case 'F5':
          event.preventDefault();
          if (existingOrder || cart.length > 0) {
            setShowReceiptDialog(true);
          }
          break;
        case 'F6':
          event.preventDefault();
          handleSendToKitchen();
          break;
        case 'F7':
          event.preventDefault();
          handleQuickPay('cash');
          break;
        case 'F8':
          event.preventDefault();
          handleQuickPay('card');
          break;
        case 'F9':
          event.preventDefault();
          setShowPaymentDialog(true);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, existingOrder, showReceiptDialog, showPaymentDialog, menuSearch, toast]);

  // Orders view functions
  const loadAllOrders = useCallback(async () => {
    try {
      const data = await getOrders(undefined, 100, selectedBranch || undefined);
      setAllOrders(data);
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    }
  }, [selectedBranch]);

  // Kitchen view functions  
  const loadKitchenOrders = useCallback(async () => {
    try {
      const data = await getKitchenOrders();
      setKitchenOrders(data);
      setIsConnected(true);
    } catch (error) {
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

  // Debounced realtime refetch - prevents burst refetches (3-4 calls down to 1)
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefetch = useCallback((fn: () => void) => {
    if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
    realtimeTimerRef.current = setTimeout(fn, 300);
  }, []);

  // Realtime subscription for orders - with debouncing & view-gating
  useOrdersRealtime(
    useCallback((newOrder) => {
      if (view === 'orders') debouncedRefetch(loadAllOrders);
      if (view === 'kitchen') {
        debouncedRefetch(loadKitchenOrders);
        toast({ title: 'New Order!', description: 'A new order has arrived' });
      }
    }, [view, loadAllOrders, loadKitchenOrders, toast, debouncedRefetch]),
    useCallback((updatedOrder) => {
      // Surgical update: patch only the changed order in local state
      setAllOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
      setKitchenOrders(prev => {
        // If order moved past kitchen states, remove it
        if (['SERVED', 'BILL_REQUESTED', 'PAID', 'CLOSED'].includes(updatedOrder.order_status)) {
          return prev.filter(o => o.id !== updatedOrder.id);
        }
        return prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o);
      });
    }, []),
    useCallback((deletedId: string) => {
      setAllOrders(prev => prev.filter(o => o.id !== deletedId));
      setKitchenOrders(prev => prev.filter(o => o.id !== deletedId));
    }, [])
  );

  // Kitchen timers to show order age
  useEffect(() => {
    const interval = setInterval(() => setTimerTick(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  function formatOrderAge(createdAt: string) {
    const seconds = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  function clearCurrentOrder() {
    setCart([]);
    setExistingOrder(null);
    setSelectedTable(null);
    setCustomerName('');
    setDiscount(0);
    setIsFOC(false);
    setFocDancerName('');
    setOrderType('dine-in');
    setMenuSession('all');
    setShowQuickPay(false);
  }

  function handleHoldBill() {
    if (cart.length === 0 && !existingOrder) {
      toast({ variant: 'destructive', title: 'Hold Failed', description: 'Cart is empty' });
      return;
    }

    const holdEntry: HeldBill = {
      id: crypto.randomUUID(),
      name: `Held ${new Date().toLocaleTimeString()}`,
      table: selectedTable,
      orderType,
      customerName,
      cart: [...cart],
      discount,
      isFOC,
      session: menuSession,
      createdAt: new Date().toISOString(),
    };

    setHeldBills(prev => [holdEntry, ...prev].slice(0, 20));
    clearCurrentOrder();
    toast({ title: 'Bill Held', description: `Saved as ${holdEntry.name}` });
  }

  function handleRecallBill(hold: HeldBill) {
    setCart(hold.cart);
    setSelectedTable(hold.table || null);
    setOrderType(hold.orderType);
    setCustomerName(hold.customerName);
    setDiscount(hold.discount);
    setIsFOC(hold.isFOC);
    setMenuSession(hold.session);
    setHeldBills(prev => prev.filter(h => h.id !== hold.id));
    toast({ title: 'Bill Recalled', description: `Recalled ${hold.name}` });
  }

  function handleRepeatLastOrder() {
    if (!lastRepeatOrder || !lastRepeatOrder.order_items?.length) {
      toast({ variant: 'destructive', title: 'No paid orders', description: 'Cannot repeat last order yet.' });
      return;
    }

    const repeated = lastRepeatOrder.order_items.map(item => ({
      menuItem: {
        id: item.menu_item?.id || crypto.randomUUID(),
        branch_id: selectedBranch,
        category_id: item.menu_item?.category_id || null,
        name: item.menu_item?.name || 'Item',
        description: item.menu_item?.description || null,
        price: item.unit_price,
        image_url: item.menu_item?.image_url || null,
        is_available: true,
        is_active: true,
        session: 'all',
        is_daily_special: false,
        is_favorite: false,
        bottle_size_ml: null,
        cost_price: null,
        serving_size_ml: null,
        serving_price: null,
        billing_type: 'service',
        portion_options: null,
      } as any,
      quantity: item.quantity,
      isServing: item.is_serving || false,
      notes: item.notes || undefined,
      selectedPortion: null,
      portionName: item.portion_name || undefined,
    }));

    setCart(repeated);
    setSelectedTable(lastRepeatOrder.table || null);
    setCustomerName(lastRepeatOrder.customer_name || '');
    setDiscount(Number(lastRepeatOrder.discount_amount || 0));
    setOrderType(lastRepeatOrder.order_status === 'delivery' ? 'delivery' : 'dine-in');
    toast({ title: 'Last Order Loaded', description: `Loaded from ${lastRepeatOrder.order_number}` });
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

  // Handle menu item click - check if portion/serving selection needed
  function handleMenuItemClick(item: MenuItem) {
    if (!item.is_available) return;
    
    // If item has portion options, show portion dialog
    let portions: PortionOption[] = [];
    if (Array.isArray(item.portion_options)) {
      portions = item.portion_options;
    } else if (typeof item.portion_options === 'string') {
      try { portions = JSON.parse(item.portion_options); } catch {}
    }
    if (portions.length > 0) {
      setSelectedServingItem(item);
      setShowServingDialog(true);
    }
    // If item is by_serving type with legacy bottle/shot pricing
    else if (item.billing_type === 'by_serving' && item.serving_price) {
      setSelectedServingItem(item);
      setShowServingDialog(true);
    } else {
      // For bottle_only or service items, add directly
      addToCart(item, undefined, false, quickAddQty);
    }
  }

  // Add item to cart with portion/serving support
  function addToCart(item: MenuItem, selectedPortion?: PortionOption, isServing: boolean = false, quantity: number = 1) {
    let price = item.price;
    let cartKey = item.id;
    
    if (selectedPortion) {
      price = selectedPortion.price;
      cartKey = `${item.id}-portion-${selectedPortion.name}`;
    } else if (isServing) {
      price = item.serving_price || item.price;
      cartKey = `${item.id}-serving`;
    }
    
    setCart(prev => {
      // Find existing cart item with same key
      const existingIndex = prev.findIndex(c => {
        if (selectedPortion) {
          return c.menuItem.id === item.id && c.selectedPortion?.name === selectedPortion.name;
        }
        return c.menuItem.id === item.id && c.isServing === isServing && !c.selectedPortion;
      });
      
      if (existingIndex >= 0) {
        return prev.map((c, i) => 
          i === existingIndex ? { ...c, quantity: c.quantity + quantity } : c
        );
      }
      return [...prev, { 
        menuItem: { ...item, price }, // Override price based on selection
        quantity, 
        isServing,
        selectedPortion,
        portionName: selectedPortion?.name || undefined,
      }];
    });
  }

  // Handle portion/serving selection from dialog
  function handlePortionSelect(item: MenuItem, selectedPortion?: PortionOption, isServing?: boolean) {
    addToCart(item, selectedPortion, isServing || false);
  }

  function updateCartQuantity(itemId: string, isServing: boolean | undefined, delta: number, selectedPortion?: PortionOption) {
    setCart(prev => prev.map(c => {
      const matches = selectedPortion 
        ? (c.menuItem.id === itemId && c.selectedPortion?.name === selectedPortion.name)
        : (c.menuItem.id === itemId && c.isServing === isServing && !c.selectedPortion);
      
      if (matches) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : c;
      }
      return c;
    }).filter(c => c.quantity > 0));
  }

  function removeFromCart(itemId: string, isServing: boolean | undefined, selectedPortion?: PortionOption) {
    setCart(prev => prev.filter(c => {
      if (selectedPortion) {
        return !(c.menuItem.id === itemId && c.selectedPortion?.name === selectedPortion.name);
      }
      return !(c.menuItem.id === itemId && c.isServing === isServing && !c.selectedPortion);
    }));
  }

  const [discount, setDiscount] = useState<number>(0);
  const [isFOC, setIsFOC] = useState(false);
  const [focDancerName, setFocDancerName] = useState('');
  
  const subtotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
  const total = subtotal - discount;
  const existingTotal = existingOrder?.total_amount ? Number(existingOrder.total_amount) : 0;
  // When existingOrder is present, its total_amount already includes its own discount,
  // so only add the new cart's subtotal (not 'total' which subtracts discount again).
  // If no new cart items, just use existingTotal. For new orders, use total (subtotal - discount).
  const grandTotal = isFOC ? 0 : (existingOrder 
    ? (cart.length > 0 ? existingTotal + subtotal : existingTotal) 
    : total);

  // Check if any cart items require kitchen preparation
  function hasKitchenItems(): boolean {
    return cart.some(item => {
      const category = categories.find(c => c.id === item.menuItem.category_id);
      return category?.requires_kitchen === true;
    });
  }

  async function handleSendToKitchen() {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Cart is empty', description: 'Add items before sending to kitchen' });
      return;
    }

    setLoading(true);
    try {
      let orderId: string;
      
      // Prepare cart items for batch insert
      const batchItems = cart.map(item => ({
        menuItem: item.menuItem,
        quantity: item.quantity,
        notes: item.notes,
        isServing: item.isServing,
        portionName: item.portionName || item.selectedPortion?.name,
      }));
      
      // Check if any items require kitchen
      const needsKitchen = hasKitchenItems();
      
      if (existingOrder) {
        orderId = existingOrder.id;
        
        // BATCH: Single database call for all items
        await addOrderItemsBatch(orderId, batchItems);
        
        if (needsKitchen) {
          if (existingOrder.order_status !== 'CREATED' && existingOrder.order_status !== 'SENT_TO_KITCHEN') {
            await supabase
              .from('orders')
              .update({ order_status: 'SENT_TO_KITCHEN', updated_at: new Date().toISOString() })
              .eq('id', orderId);
          } else if (existingOrder.order_status === 'CREATED') {
            await sendToKitchen(orderId);
          }
          toast({ 
            title: 'Items Sent to Kitchen!', 
            description: `${cart.length} items sent for ${selectedTable?.table_number || 'Takeaway'}` 
          });
        } else {
          // No kitchen items - transition through states to skip kitchen display
          await sendToKitchen(orderId);   // CREATED → SENT_TO_KITCHEN
          await markAsServed(orderId);    // SENT_TO_KITCHEN → SERVED
          toast({ 
            title: 'Items Ready!', 
            description: `${cart.length} items ready to serve for ${selectedTable?.table_number || 'Takeaway'}` 
          });
        }
      } else {
        const newOrder = await createOrder(selectedTable?.id || null, customerName || undefined);
        orderId = newOrder.id;
        
        // BATCH: Single database call for all items
        await addOrderItemsBatch(orderId, batchItems);
        
        if (needsKitchen) {
          await sendToKitchen(orderId);
          toast({ 
            title: 'Order Sent to Kitchen!', 
            description: `Order for ${selectedTable?.table_number || 'Takeaway'} sent to kitchen` 
          });
        } else {
          // No kitchen items - transition through states to skip kitchen display
          await sendToKitchen(orderId);   // CREATED → SENT_TO_KITCHEN
          await markAsServed(orderId);    // SENT_TO_KITCHEN → SERVED
          toast({ 
            title: 'Order Ready!', 
            description: `Order for ${selectedTable?.table_number || 'Takeaway'} ready to serve` 
          });
        }
      }
      
      // Silent KOT print (fire-and-forget)
      try {
        const kotItems = cart.map(c => ({
          name: c.menuItem.name,
          quantity: c.quantity,
          notes: c.notes,
          portionName: c.portionName || c.selectedPortion?.name,
          isServing: c.isServing,
        }));
        printKOT(selectedTable?.table_number || null, kotItems);
      } catch (e) {}
      
      setCart([]);
      setExistingOrder(null);
      setSelectedTable(null);
      setCustomerName('');
      setView('tables');
      refetchTables();
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  // FOC (Free of Cost) handler
  async function handleFOCConfirm() {
    if (cart.length === 0 && !existingOrder) {
      toast({ variant: 'destructive', title: 'Cart is empty', description: 'Add items before confirming FOC' });
      return;
    }
    if (!focDancerName.trim()) {
      toast({ variant: 'destructive', title: 'Person name required', description: 'Enter the person name for FOC' });
      return;
    }

    setLoading(true);
    try {
      let orderId: string;

      if (existingOrder) {
        // Apply FOC to existing order on the table
        orderId = existingOrder.id;
        // Add any new cart items
        if (cart.length > 0) {
          const batchItems = cart.map(item => ({
            menuItem: item.menuItem,
            quantity: item.quantity,
            notes: item.notes,
            isServing: item.isServing,
            portionName: item.portionName || item.selectedPortion?.name,
          }));
          await addOrderItemsBatch(orderId, batchItems);
        }
      } else {
        // Create new order from cart
        const batchItems = cart.map(item => ({
          menuItem: item.menuItem,
          quantity: item.quantity,
          notes: item.notes,
          isServing: item.isServing,
          portionName: item.portionName || item.selectedPortion?.name,
        }));
        const newOrder = await createOrder(selectedTable?.id || null, customerName || undefined);
        orderId = newOrder.id;
        await addOrderItemsBatch(orderId, batchItems);
      }

      // Mark as FOC with full discount
      const focSubtotal = existingTotal + subtotal;
      await supabase.from('orders').update({
        is_foc: true,
        foc_dancer_name: focDancerName.trim(),
        discount_amount: focSubtotal,
        total_amount: 0,
        subtotal: focSubtotal,
      }).eq('id', orderId);

      // Single atomic RPC handles full state traversal + payment
      await quickPayOrder(orderId, 0, 'cash');

      toast({ title: '🎁 FOC Confirmed!', description: `FOC for: ${focDancerName}` });

      setCart([]);
      setExistingOrder(null);
      setSelectedTable(null);
      setCustomerName('');
      setDiscount(0);
      setIsFOC(false);
      setFocDancerName('');
      setView('tables');
      refetchTables();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'FOC Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  // Takeaway payment-first flow
  async function handleTakeawayPayment() {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Cart is empty', description: 'Add items before payment' });
      return;
    }
    setShowQuickPay(true);
  }

  async function handlePayNow() {
    if (cart.length === 0 && !existingOrder) {
      toast({ variant: 'destructive', title: 'Nothing to pay', description: 'Add items or select a table with an order' });
      return;
    }
    setShowQuickPay(true);
  }

  // One-tap quick payment (Cash/Card/Mobile) - no dialog
  async function handleQuickPay(method: PaymentMethod) {
    setShowQuickPay(false);
    setPaymentMethod(method);
    // Reuse existing handleProcessPayment logic
    setLoading(true);
    try {
      let orderId: string;
      let paymentTotal = grandTotal;
      
      const batchItems = cart.map(item => ({
        menuItem: item.menuItem,
        quantity: item.quantity,
        notes: item.notes,
        isServing: item.isServing,
        portionName: item.portionName || item.selectedPortion?.name,
      }));
      
      if (existingOrder) {
        orderId = existingOrder.id;
        if (cart.length > 0) {
          await addOrderItemsBatch(orderId, batchItems);
        }
        paymentTotal = grandTotal;
      } else {
        const newOrder = await createOrder(selectedTable?.id || null, customerName || undefined);
        orderId = newOrder.id;
        await addOrderItemsBatch(orderId, batchItems);
        if (discount > 0) {
          await applyDiscount(orderId, discount);
        }
        paymentTotal = grandTotal;
      }
      
      await quickPayOrder(orderId, paymentTotal, method);
      
      let realOrderNumber: string | null = null;
      try {
        const { data: orderRow } = await supabase
          .from('orders')
          .select('order_number')
          .eq('id', orderId)
          .maybeSingle();
        realOrderNumber = orderRow?.order_number || null;
      } catch (e) {}
      
      // Build receipt from local state
      const localReceipt = {
        id: orderId,
        order_number: realOrderNumber,
        branch_id: selectedBranch,
        table_id: selectedTable?.id || null,
        table: selectedTable ? { id: selectedTable.id, table_number: selectedTable.table_number, capacity: selectedTable.capacity } : null,
        order_status: 'PAID' as const,
        payment_status: 'paid' as const,
        subtotal: subtotal + existingTotal,
        discount_amount: discount,
        tax_amount: 0,
        total_amount: paymentTotal,
        customer_name: customerName || null,
        is_foc: isFOC,
        foc_dancer_name: focDancerName || null,
        notes: null,
        created_by: profile?.user_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_at: null,
        order_items: [
          ...(existingOrder?.order_items || []),
          ...cart.map(c => ({
            id: crypto.randomUUID(),
            order_id: orderId,
            menu_item_id: c.menuItem.id,
            quantity: c.quantity,
            unit_price: c.menuItem.price,
            total_price: c.menuItem.price * c.quantity,
            notes: c.notes || null,
            is_serving: c.isServing || false,
            portion_name: c.portionName || c.selectedPortion?.name || null,
            created_at: new Date().toISOString(),
            menu_item: { id: c.menuItem.id, name: c.menuItem.name, price: c.menuItem.price, image_url: c.menuItem.image_url || null },
          })),
        ],
        waiter: profile ? { full_name: profile.full_name } : null,
      } as unknown as Order;
      
      setReceiptOrder(localReceipt);
      setShowReceiptDialog(true);
      toast({ title: '✅ Payment Successful!' });
      
      // Silent invoice print
      try {
        const branch = branches.find(b => b.id === selectedBranch);
        const invoiceItems = [
          ...(existingOrder?.order_items || []).map((oi: any) => ({
            name: oi.menu_item?.name || 'Item',
            quantity: oi.quantity,
            unitPrice: Number(oi.unit_price),
            totalPrice: Number(oi.total_price),
            portionName: oi.portion_name,
            isServing: oi.is_serving,
          })),
          ...cart.map(c => ({
            name: c.menuItem.name,
            quantity: c.quantity,
            unitPrice: c.menuItem.price,
            totalPrice: c.menuItem.price * c.quantity,
            portionName: c.portionName || c.selectedPortion?.name,
            isServing: c.isServing,
          })),
        ];
        printInvoice({
          orderNumber: realOrderNumber,
          tableName: selectedTable?.table_number || null,
          waiterName: profile?.full_name,
          branchName: branch?.name,
          branchAddress: branch?.address,
          branchPhone: branch?.phone,
          items: invoiceItems,
          subtotal: subtotal + existingTotal,
          discount,
          total: paymentTotal,
          paymentMethod: method,
          isFOC,
          focName: focDancerName || null,
        });
      } catch (e) { /* Invoice print skipped */ }
      
      setCart([]);
      setExistingOrder(null);
      setSelectedTable(null);
      setCustomerName('');
      setDiscount(0);
      setIsFOC(false);
      setFocDancerName('');
      setView('tables');
      setTransactionRef('');
      refetchTables();
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessPayment() {
    setLoading(true);
    try {
      let orderId: string;
      let paymentTotal = grandTotal;
      
      // Prepare cart items for batch insert
      const batchItems = cart.map(item => ({
        menuItem: item.menuItem,
        quantity: item.quantity,
        notes: item.notes,
        isServing: item.isServing,
        portionName: item.portionName || item.selectedPortion?.name,
      }));
      
      const isTakeaway = orderType === 'take-out' && !existingOrder;
      const needsKitchen = hasKitchenItems();
      
      if (existingOrder) {
        orderId = existingOrder.id;
        
        if (cart.length > 0) {
          // BATCH: Single database call for all items
          await addOrderItemsBatch(orderId, batchItems);
        }
        
        // Use grandTotal which already handles existing order discount correctly
        paymentTotal = grandTotal;
        
        // quick_pay_order handles state traversal from any status
      } else {
        const newOrder = await createOrder(selectedTable?.id || null, customerName || undefined);
        orderId = newOrder.id;
        
        // BATCH: Single database call for all items
        await addOrderItemsBatch(orderId, batchItems);
        
        // Apply discount to order before payment
        if (discount > 0) {
          await applyDiscount(orderId, discount);
        }
        
        // Use local grandTotal to avoid extra DB round-trip
        paymentTotal = grandTotal;
        
        // For new orders, quick_pay_order handles state traversal in one call
      }
      
      // Single atomic RPC: traverses states + records payment + deducts inventory
      await quickPayOrder(orderId, paymentTotal, paymentMethod);
      
      // Fetch real order number from DB (generated by trigger)
      let realOrderNumber: string | null = null;
      try {
        const { data: orderRow } = await supabase
          .from('orders')
          .select('order_number')
          .eq('id', orderId)
          .maybeSingle();
        realOrderNumber = orderRow?.order_number || null;
      } catch (e) {}
      
      setShowPaymentDialog(false);
      
      // Build receipt from local state with real order number
      const localReceipt = {
        id: orderId,
        order_number: realOrderNumber,
        branch_id: selectedBranch,
        table_id: selectedTable?.id || null,
        table: selectedTable ? { id: selectedTable.id, table_number: selectedTable.table_number, capacity: selectedTable.capacity } : null,
        order_status: 'PAID' as const,
        payment_status: 'paid' as const,
        subtotal: subtotal + existingTotal,
        discount_amount: discount,
        tax_amount: 0,
        total_amount: paymentTotal,
        customer_name: customerName || null,
        is_foc: isFOC,
        foc_dancer_name: focDancerName || null,
        notes: null,
        created_by: profile?.user_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_at: null,
        order_items: [
          ...(existingOrder?.order_items || []),
          ...cart.map(c => ({
            id: crypto.randomUUID(),
            order_id: orderId,
            menu_item_id: c.menuItem.id,
            quantity: c.quantity,
            unit_price: c.menuItem.price,
            total_price: c.menuItem.price * c.quantity,
            notes: c.notes || null,
            is_serving: c.isServing || false,
            portion_name: c.portionName || c.selectedPortion?.name || null,
            created_at: new Date().toISOString(),
            menu_item: { id: c.menuItem.id, name: c.menuItem.name, price: c.menuItem.price, image_url: c.menuItem.image_url || null },
          })),
        ],
        waiter: profile ? { full_name: profile.full_name } : null,
      } as unknown as Order;
      
      // Show receipt immediately - no animation delay
      setReceiptOrder(localReceipt);
      setShowReceiptDialog(true);
      toast({ title: 'Payment Successful!' });
      
      // Silent invoice print (fire-and-forget)
      try {
        const branch = branches.find(b => b.id === selectedBranch);
        const invoiceItems = [
          ...(existingOrder?.order_items || []).map((oi: any) => ({
            name: oi.menu_item?.name || 'Item',
            quantity: oi.quantity,
            unitPrice: Number(oi.unit_price),
            totalPrice: Number(oi.total_price),
            portionName: oi.portion_name,
            isServing: oi.is_serving,
          })),
          ...cart.map(c => ({
            name: c.menuItem.name,
            quantity: c.quantity,
            unitPrice: c.menuItem.price,
            totalPrice: c.menuItem.price * c.quantity,
            portionName: c.portionName || c.selectedPortion?.name,
            isServing: c.isServing,
          })),
        ];
        printInvoice({
          orderNumber: realOrderNumber,
          tableName: selectedTable?.table_number || null,
          waiterName: profile?.full_name,
          branchName: branch?.name,
          branchAddress: branch?.address,
          branchPhone: branch?.phone,
          items: invoiceItems,
          subtotal: subtotal + existingTotal,
          discount,
          total: paymentTotal,
          paymentMethod,
          isFOC,
          focName: focDancerName || null,
        });
      } catch (e) {}
      
      // For takeaway: After payment is done, notify kitchen if needed
      if (isTakeaway && needsKitchen) {
        toast({ 
          title: 'Order sent to kitchen', 
          description: 'Order sent to kitchen for preparation' 
        });
      }
      
      setCart([]);
      setExistingOrder(null);
      setSelectedTable(null);
      setCustomerName('');
      setDiscount(0);
      setIsFOC(false);
      setFocDancerName('');
      setView('tables');
      setTransactionRef('');
      refetchTables();
      
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
      await quickPayOrder(selectedOrderForPayment.id, paymentTotal, paymentMethod);
      
      // Fetch real order number from DB
      let realOrderNumber = selectedOrderForPayment.order_number;
      try {
        const { data: orderRow } = await supabase
          .from('orders')
          .select('order_number')
          .eq('id', selectedOrderForPayment.id)
          .maybeSingle();
        if (orderRow?.order_number) realOrderNumber = orderRow.order_number;
      } catch (e) {
        // Unable to fetch order number
      }
      
      setShowPaymentDialog(false);
      setSelectedOrderForPayment(null);
      setTransactionRef('');
      
      // Build receipt from existing order data with real order number
      const localReceipt = {
        ...selectedOrderForPayment,
        order_number: realOrderNumber,
        order_status: 'PAID' as const,
        payment_status: 'paid' as const,
        updated_at: new Date().toISOString(),
      } as unknown as Order;
      
      // Show receipt immediately - no animation delay
      setReceiptOrder(localReceipt);
      setShowReceiptDialog(true);
      toast({ title: 'Payment Successful!' });
      
      loadAllOrders();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  // Admin handlers for edit and cancel
  function handleEditOrder(order: Order) {
    setSelectedOrderForPayment(null);
    setExistingOrder(order);
    setCart([]);
    setSelectedTable((order as any).table || null);
    setCustomerName((order as any).customer_name || '');
    setDiscount(Number(order.discount_amount) || 0);
    setView('menu');
    toast({ title: 'Order Loaded', description: 'You can now edit this order' });
  }

  async function handleCancelOrder(orderId: string) {
    if (!confirm('Cancel this order? This action cannot be undone.')) return;
    setLoading(true);
    try {
      await cancelOrder(orderId);
      toast({ title: 'Order Cancelled' });
      loadAllOrders();
      refetchTables();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  function handleViewOrder(order: Order) {
    setReceiptOrder(order);
    setShowReceiptDialog(true);
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

  // Numeric keypad handlers
  function showKeypad(title: string, initialValue: string, callback: (value: string) => void) {
    setKeypadTitle(title);
    setKeypadValue(initialValue);
    setKeypadCallback(() => callback);
    setShowNumericKeypad(true);
  }

  function handleKeypadSubmit() {
    if (keypadCallback) {
      keypadCallback(keypadValue);
    }
    setShowNumericKeypad(false);
    setKeypadValue('');
    setKeypadCallback(null);
  }

  function handleKeypadCancel() {
    setShowNumericKeypad(false);
    setKeypadValue('');
    setKeypadCallback(null);
  }



  const filteredItems = menuItems.filter(i => {
    const matchesCategory = selectedCategory ? i.category_id === selectedCategory : true;
    const matchesSearch = menuSearch.trim() === '' || i.name.toLowerCase().includes(menuSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeOrders = allOrders.filter(o => !['PAID', 'CLOSED'].includes(o.order_status));
  const completedOrders = allOrders.filter(o => ['PAID', 'CLOSED'].includes(o.order_status));

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-gradient-to-r from-orange-600 via-amber-600 to-red-500 px-2 sm:px-4 py-2 flex items-center gap-2 sm:gap-4 max-md:py-3 sticky top-0 z-40">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-white hover:bg-white/20 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Back</span>
          </Button>
          <div className="flex items-center gap-1.5 shrink-0">
            <UtensilsCrossed className="h-5 w-5 text-white" />
            <h1 className="font-bold text-sm sm:text-lg text-white">POS</h1>
          </div>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
            {([
              { key: 'tables' as ViewType, icon: LayoutGrid, label: 'Tables', mobileColor: 'bg-emerald-500' },
              { key: 'menu' as ViewType, icon: ShoppingCart, label: 'Menu', mobileColor: 'bg-amber-500' },
              { key: 'orders' as ViewType, icon: ClipboardList, label: 'Orders', mobileColor: 'bg-sky-500' },
              { key: 'kitchen' as ViewType, icon: ChefHat, label: 'Kitchen', mobileColor: 'bg-rose-500' },
            ]).map(({ key, icon: Icon, label, mobileColor }) => (
              <Button 
                key={key}
                variant={view === key ? 'default' : 'outline'} 
                size="lg"
                className={`shrink-0 h-12 px-4 ${isMobile ? (view === key ? `${mobileColor} text-white border-0 shadow-lg` : 'bg-white/20 text-white border-white/30 hover:bg-white/30') : ''}`}
                onClick={() => setView(key)}
              >
                <Icon className="h-5 w-5" />
                <span className="hidden md:inline ml-2">{label}</span>
              </Button>
            ))}
          </div>
          {selectedTable && (
            <Badge variant="secondary" className="ml-1 sm:ml-2 shrink-0 max-md:bg-white/20 max-md:text-white max-md:border-0">
              {selectedTable.table_number}
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
            <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-400' : 'text-white/50'}`} />
            <span className="text-xs text-white/70 hidden sm:inline">
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </header>

        {/* Tables View */}
        {view === 'tables' && (
          <main className="flex-1 flex flex-col overflow-auto">
            {/* Branch Selector Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 sm:p-4 border-b bg-card">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {canSwitchBranch ? (
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
                ) : (
                  <Badge variant="outline" className="text-sm py-2 px-4 flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    📍 {branches.find(b => b.id === selectedBranch)?.name || 'My Branch'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={mergeMode ? 'destructive' : 'outline'}
                  onClick={() => {
                    setMergeMode(prev => !prev);
                    setMergeSourceTable(null);
                    toast({ title: mergeMode ? 'Merge canceled' : 'Merge started', description: mergeMode ? 'Merge mode disabled' : 'Select source table first' });
                  }}
                >
                  {mergeMode ? 'Cancel Merge' : 'Merge Tables'}
                </Button>
                {mergeMode && mergeSourceTable && (
                  <span className="text-xs text-muted-foreground">Source: {mergeSourceTable.table_number}</span>
                )}
              </div>
            </div>
            
            {/* Tables Grid */}
            <div className="p-2 sm:p-4">
              {/* Takeaway Card */}
              <div className="mb-4">
                <Card 
                  className="cursor-pointer border-3 border-orange-500 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 rounded-3xl"
                  onClick={handleTakeout}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-orange-500 flex items-center justify-center text-white text-3xl">🛍️</div>
                    <div>
                      <div className="font-bold text-xl">Takeaway</div>
                      <div className="text-sm text-muted-foreground">Quick takeaway order</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-4">
                {tables.map(table => (
                  <Card 
                    key={table.id} 
                    className={`cursor-pointer border-3 rounded-3xl hover:shadow-xl transition-all duration-200 ${TABLE_STATUS_COLORS[table.status as string] || ''}`}
                    onClick={async () => {
                      if (mergeMode) {
                        if (!mergeSourceTable) {
                          setMergeSourceTable(table);
                          toast({ title: 'Merge source selected', description: `Now choose target table` });
                        } else if (mergeSourceTable.id === table.id) {
                          toast({ variant: 'destructive', title: 'Invalid selection', description: 'Choose a different table' });
                        } else {
                          try {
                            await mergeTables(mergeSourceTable.id, [table.id]);
                            toast({ title: 'Tables merged', description: `${mergeSourceTable.table_number} + ${table.table_number}` });
                          } catch (error: any) {
                            toast({ variant: 'destructive', title: 'Merge failed', description: error.message });
                          } finally {
                            setMergeMode(false);
                            setMergeSourceTable(null);
                            refetchTables();
                          }
                        }
                      } else {
                        handleSelectTable(table);
                      }
                    }}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                      <div className="text-3xl sm:text-4xl font-bold">{table.table_number}</div>
                      <div className="text-sm text-muted-foreground">{table.capacity} seats</div>
                      <Badge className="capitalize text-sm py-1 px-3 rounded-full">{table.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {tables.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No tables found</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Menu View */}
        {view === 'menu' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
            {/* Table/Takeaway Context Bar */}
            <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm font-bold px-3 py-1">
                  {selectedTable ? selectedTable.table_number : 'TW'}
                </Badge>
                <span className="text-sm font-medium">
                  {selectedTable ? `${selectedTable.table_number} - Dine In` : 'Takeaway'}
                </span>
                {existingOrder && (
                  <Badge variant="outline" className="text-xs">Active Order</Badge>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => {
                  setView('tables');
                  setSelectedTable(null);
                  setExistingOrder(null);
                  setOrderType('dine-in');
                }}
              >
                Change Table
              </Button>
            </div>

            {/* Search + Mobile Category Dropdown */}
            <div className="p-2 border-b bg-card flex flex-col gap-2">
              {/* Search bar - all screens */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="w-full h-10 md:h-9 pl-9 pr-8 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {menuSearch && (
                  <button onClick={() => setMenuSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {/* Mobile: category dropdown */}
              <div className="md:hidden">
                <Select value={selectedCategory || 'all'} onValueChange={(val) => setSelectedCategory(val === 'all' ? null : val)}>
                  <SelectTrigger className="h-11 rounded-xl text-base font-semibold">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Session / Daily Special / Favorites */}
              <div className="pt-2 border-t">
                <div className="flex flex-wrap gap-2 mb-2">
                  {(['all', 'breakfast', 'lunch', 'dinner'] as MenuSession[]).map(session => (
                    <Button
                      key={session}
                      variant={menuSession === session ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => setMenuSession(session)}
                    >
                      {session === 'all' ? 'All Sessions' : session.charAt(0).toUpperCase() + session.slice(1)}
                    </Button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <span className="text-xs font-semibold uppercase">Qty:</span>
                  {[1, 2, 3, 5].map(q => (
                    <Button
                      key={q}
                      size="sm"
                      variant={quickAddQty === q ? 'default' : 'outline'}
                      onClick={() => setQuickAddQty(q)}
                    >
                      x{q}
                    </Button>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setQuickAddQty(1)}>
                    Reset
                  </Button>
                </div>

                {menuItems.some(item => item.is_daily_special) && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold uppercase text-amber-600 mb-1">Today Specials</div>
                    <div className="flex flex-wrap gap-2">
                      {menuItems.filter(item => item.is_daily_special).slice(0, 12).map(item => (
                        <Button key={item.id} size="sm" className="rounded-xl" onClick={() => handleMenuItemClick(item)}>
                          {item.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {menuItems.some(item => item.is_favorite) && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold uppercase text-green-600 mb-1">Favorites</div>
                    <div className="flex flex-wrap gap-2">
                      {menuItems.filter(item => item.is_favorite).slice(0, 12).map(item => (
                        <Button key={item.id} size="sm" className="rounded-xl" onClick={() => handleMenuItemClick(item)}>
                          {item.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowHeldBills(true)}>Recall Bill</Button>
                  <Button size="sm" variant="outline" onClick={() => handleRepeatLastOrder()}>Repeat Last Order</Button>
                  <Button size="sm" variant="outline" onClick={handleHoldBill}>Hold Bill</Button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
            {/* Desktop: vertical sidebar */}
            <aside className="hidden md:block w-32 border-r bg-muted/30 p-2 overflow-auto shrink-0">
              <Button
                variant={selectedCategory === null ? 'default' : 'ghost'}
                className="w-full justify-start text-xs mb-1 h-8 px-3"
                onClick={() => setSelectedCategory(null)}
              >
                <span className="truncate">ALL MENU</span>
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'ghost'}
                  className="w-full justify-start text-xs mb-1 h-8 px-3"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className="truncate">{cat.name.toUpperCase()}</span>
                </Button>
              ))}
            </aside>

             <main className="flex-1 p-2 sm:p-3 md:p-4 overflow-y-auto min-h-0 min-w-0">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {filteredItems.map(item => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer hover:shadow-lg rounded-3xl border-2 hover:border-primary/50 transition-all duration-200 ${!item.is_available ? 'opacity-50' : ''}`}
                    onClick={() => handleMenuItemClick(item)}
                  >
                    <CardContent className="p-3 flex flex-col items-center gap-3">
                      {/* Larger Image */}
                      <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                        )}
                      </div>
                      {/* Name + Price - Larger text */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1 items-center text-center">
                        <h4 className="font-bold text-sm leading-tight line-clamp-2 text-center">{item.name}</h4>
                        <span className="font-bold text-primary text-lg">{item.price.toFixed(3)} <span className="text-sm font-normal text-muted-foreground">OMR</span></span>
                        {item.billing_type === 'by_serving' && item.serving_price && (
                          <span className="text-xs text-muted-foreground">Shot: {item.serving_price.toFixed(3)}</span>
                        )}
                      </div>
                      {/* Larger Add Button */}
                      <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20">
                        <Plus className="h-6 w-6" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </main>
            </div>
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
                        <div className="flex flex-wrap gap-2 pt-2">
                          {/* View/Print button for all orders */}
                          <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                            <Eye className="h-3 w-3 mr-1" />View
                          </Button>
                          
                          {/* Status action buttons */}
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
                          
                          {/* Admin/Manager Edit/Cancel buttons */}
                          {isManagerOrAdminUser && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)}>
                                <Edit className="h-3 w-3 mr-1" />Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleCancelOrder(order.id)}>
                                <X className="h-3 w-3 mr-1" />Cancel
                              </Button>
                            </>
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
                        {/* View/Print and Admin buttons for completed orders */}
                        <div className="flex flex-wrap gap-2 pt-3">
                          <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                            <Eye className="h-3 w-3 mr-1" />View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                            <Printer className="h-3 w-3 mr-1" />Print
                          </Button>
                          {isManagerOrAdminUser && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)}>
                                <Edit className="h-3 w-3 mr-1" />Edit
                              </Button>
                            </>
                          )}
                        </div>
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
      {(view === 'tables' || view === 'menu') && !isMobile && (
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
            {selectedTable && (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">Transfer table</div>
                <Select value={selectedTable.id} onValueChange={async (value) => {
                  const target = tables.find(t => t.id === value);
                  if (!target || !existingOrder) return;
                  try {
                    await supabase.from('orders').update({ table_id: target.id }).eq('id', existingOrder.id);
                    setSelectedTable(target);
                    refetchTables();
                    toast({ title: 'Table transferred', description: `Moved order to ${target.table_number}` });
                  } catch (error: any) {
                    toast({ variant: 'destructive', title: 'Transfer failed', description: error.message });
                  }
                }}>
                  {tables.filter(t => t.id !== selectedTable.id).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.table_number}</SelectItem>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {existingOrder && existingOrder.order_items && existingOrder.order_items.length > 0 && (
            <div className="px-4 py-2 bg-muted/50 border-b">
              <div className="text-xs font-medium text-muted-foreground mb-2">Previous Items</div>
              {existingOrder.order_items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-2 text-xs py-1">
                  <div className="flex-1 min-w-0">
                    <span className="truncate">{item.quantity}x {item.menu_item?.name || 'Item'}</span>
                    <span className="ml-2 text-muted-foreground">{Number(item.total_price).toFixed(3)} OMR</span>
                  </div>
                  {existingOrder.locked_at === null && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={async () => {
                          if (item.quantity <= 1) return;
                          try {
                            await updateOrderItemQuantity(item.id, item.quantity - 1);
                            const { data: refreshed } = await supabase.from('orders').select('*, order_items(*, menu_item:menu_items(id, name, price, image_url))').eq('id', existingOrder.id).single();
                            if (refreshed) setExistingOrder(refreshed as any);
                          } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
                        }}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-4 text-center">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={async () => {
                          try {
                            await updateOrderItemQuantity(item.id, item.quantity + 1);
                            const { data: refreshed } = await supabase.from('orders').select('*, order_items(*, menu_item:menu_items(id, name, price, image_url))').eq('id', existingOrder.id).single();
                            if (refreshed) setExistingOrder(refreshed as any);
                          } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-destructive"
                        onClick={async () => {
                          try {
                            await removeOrderItem(item.id);
                            const { data: refreshed } = await supabase.from('orders').select('*, order_items(*, menu_item:menu_items(id, name, price, image_url))').eq('id', existingOrder.id).single();
                            if (refreshed) setExistingOrder(refreshed as any);
                          } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between text-xs font-medium">
                <span>Previous Total</span>
                <span>{existingTotal.toFixed(3)} OMR</span>
              </div>
            </div>
          )}

          {heldBills.length > 0 && (
            <div className="px-4 py-3 border-b bg-muted/30">
              <div className="text-xs font-semibold text-muted-foreground mb-2">Held Bills</div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {heldBills.map((hold) => (
                  <div key={hold.id} className="flex items-center justify-between gap-2">
                    <button
                      className="text-left text-xs truncate font-medium"
                      onClick={() => handleRecallBill(hold)}
                    >
                      {hold.name} ({hold.cart.length})
                    </button>
                    <Button size="icon" variant="ghost" onClick={() => setHeldBills(prev => prev.filter(h => h.id !== hold.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
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
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div key={`${item.menuItem.id}-${item.isServing ? 'serving' : 'bottle'}-${idx}`} className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {item.menuItem.name}
                        {item.isServing && <span className="text-xs ml-1 text-muted-foreground">(Shot)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.menuItem.price.toFixed(3)} OMR each
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-10 w-10 rounded-full" 
                        onClick={() => updateCartQuantity(item.menuItem.id, item.isServing, -1, item.selectedPortion)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center text-lg font-bold">{item.quantity}</span>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-10 w-10 rounded-full" 
                        onClick={() => updateCartQuantity(item.menuItem.id, item.isServing, 1, item.selectedPortion)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-10 w-10 rounded-full text-destructive hover:bg-destructive hover:text-destructive-foreground" 
                        onClick={() => removeFromCart(item.menuItem.id, item.isServing, item.selectedPortion)}
                      >
                        <Trash2 className="h-4 w-4" />
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
              {!isFOC && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Discount</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-32 h-8 text-right font-mono"
                    onClick={() => showKeypad('Enter Discount', discount?.toString() || '', (value) => setDiscount(Math.max(0, parseFloat(value) || 0)))}
                  >
                    {discount?.toFixed(3) || '0.000'}
                  </Button>
                </div>
              )}
              {!isFOC && discount > 0 && (
                <div className="flex justify-between text-green-500">
                  <span>Discount Applied</span>
                  <span>-{discount.toFixed(3)} OMR</span>
                </div>
              )}

              {/* FOC Toggle */}
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-muted-foreground text-sm">🎁 FOC (Free)</span>
                <Button
                  variant={isFOC ? 'default' : 'outline'}
                  size="sm"
                  className={`h-7 text-xs ${isFOC ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => {
                    setIsFOC(!isFOC);
                    if (!isFOC) setDiscount(0);
                  }}
                >
                  {isFOC ? 'FOC ON' : 'FOC OFF'}
                </Button>
              </div>
              {isFOC && (
                <Input
                  placeholder="Person Name (required)"
                  value={focDancerName}
                  onChange={(e) => setFocDancerName(e.target.value)}
                  className="h-7 text-sm"
                />
              )}
              {isFOC && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>FOC - Full Discount</span>
                  <span>-{(existingTotal + subtotal).toFixed(3)} OMR</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{grandTotal.toFixed(3)} OMR</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {isFOC ? (
                <Button 
                  size="lg"
                  className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 h-16 text-xl font-bold rounded-2xl"
                  onClick={handleFOCConfirm}
                  disabled={(cart.length === 0 && !existingOrder?.order_items?.length) || !focDancerName.trim() || loading}
                >
                  🎁 CONFIRM FOC
                </Button>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="secondary" 
                      size="lg"
                      className="flex items-center justify-center gap-3 h-16 text-lg font-bold rounded-2xl bg-orange-500 hover:bg-orange-600 text-white border-0"
                      onClick={handleSendToKitchen}
                      disabled={cart.length === 0 || loading}
                    >
                      <ChefHat className="h-6 w-6" />
                      KOT
                    </Button>
                    <Button 
                      size="lg"
                      className="flex items-center justify-center gap-3 bg-primary h-16 text-lg font-bold rounded-2xl hover:bg-primary/90"
                      onClick={handlePayNow}
                      disabled={(cart.length === 0 && !existingOrder) || loading}
                    >
                      <CreditCard className="h-6 w-6" />
                      PAY
                    </Button>
                  </div>
                  {/* Quick Pay Buttons - shown after tapping PAY */}
                  {showQuickPay && (
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <Button
                        size="lg"
                        className="flex-col gap-2 h-20 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg"
                        onClick={() => handleQuickPay('cash')}
                        disabled={loading}
                      >
                        <Banknote className="h-8 w-8" />
                        <span className="text-sm font-bold">Cash</span>
                      </Button>
                      <Button
                        size="lg"
                        className="flex-col gap-2 h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg"
                        onClick={() => handleQuickPay('card')}
                        disabled={loading}
                      >
                        <CreditCard className="h-8 w-8" />
                        <span className="text-sm font-bold">Card</span>
                      </Button>
                      <Button
                        size="lg"
                        className="flex-col gap-2 h-20 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-lg"
                        onClick={() => handleQuickPay('mobile')}
                        disabled={loading}
                      >
                        <Smartphone className="h-8 w-8" />
                        <span className="text-sm font-bold">Mobile</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="col-span-3 text-sm h-12 rounded-xl"
                        onClick={() => { setShowQuickPay(false); setShowPaymentDialog(true); }}
                      >
                        Split Payment
                      </Button>
                    </div>
                  )}
                </>
              )}
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

          {/* Pre-Payment Invoice Preview */}
          {(() => {
            const invoiceItems = selectedOrderForPayment
              ? (Array.isArray(selectedOrderForPayment.order_items) ? selectedOrderForPayment.order_items : [])
              : [
                  ...(existingOrder?.order_items || []).map((item: any) => ({
                    id: item.id,
                    name: item.menu_item?.name || 'Item',
                    quantity: item.quantity,
                    portion_name: item.portion_name,
                    total_price: Number(item.total_price),
                  })),
                  ...cart.map(c => ({
                    id: c.menuItem.id + (c.selectedPortion?.name || ''),
                    name: c.menuItem.name,
                    quantity: c.quantity,
                    portion_name: c.portionName || c.selectedPortion?.name || null,
                    total_price: c.menuItem.price * c.quantity,
                  })),
                ];
            const invoiceSubtotal = selectedOrderForPayment
              ? Number(selectedOrderForPayment.subtotal || selectedOrderForPayment.total_amount || 0)
              : subtotal + existingTotal;
            const invoiceDiscount = selectedOrderForPayment
              ? Number(selectedOrderForPayment.discount_amount || 0)
              : discount;
            const invoiceTotal = selectedOrderForPayment
              ? Number(selectedOrderForPayment.total_amount || 0)
              : grandTotal;
            const tableLabel = selectedOrderForPayment?.table
              ? `Table ${(selectedOrderForPayment.table as any).table_number}`
              : selectedTable
                ? `Table ${selectedTable.table_number}`
                : 'Takeaway';

            return (
              <div className="border rounded-md p-3 bg-muted/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Invoice Preview</span>
                  <Badge variant="outline" className="text-xs">{tableLabel}</Badge>
                </div>
                <ScrollArea className="max-h-[180px]">
                  <div className="space-y-1 pr-3">
                    {invoiceItems.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="flex justify-between text-xs">
                        <span className="truncate mr-2">
                          {item.quantity || 1}x {item.menu_item?.name || item.name || 'Item'}
                          {(item.portion_name) && <span className="text-muted-foreground"> ({item.portion_name})</span>}
                        </span>
                        <span className="whitespace-nowrap font-mono">
                          {(Number(item.total_price) || 0).toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Separator className="my-2" />
                {invoiceDiscount > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">{invoiceSubtotal.toFixed(3)} OMR</span>
                  </div>
                )}
                {invoiceDiscount > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Discount</span>
                    <span className="font-mono">-{invoiceDiscount.toFixed(3)} OMR</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold mt-1">
                  <span>Total</span>
                  <span className="font-mono">{invoiceTotal.toFixed(3)} OMR</span>
                </div>
              </div>
            );
          })()}

          <div className="space-y-4">
            {/* For orders from the orders view, show quick pay buttons */}
            {selectedOrderForPayment && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { method: 'cash' as PaymentMethod, icon: Banknote, label: 'Cash', color: 'bg-green-600 hover:bg-green-700 text-white' },
                  { method: 'card' as PaymentMethod, icon: CreditCard, label: 'Card', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
                  { method: 'mobile' as PaymentMethod, icon: Smartphone, label: 'Mobile', color: 'bg-purple-600 hover:bg-purple-700 text-white' },
                ].map(({ method, icon: Icon, label, color }) => (
                  <Button
                    key={method}
                    className={`h-16 flex-col gap-1 ${color}`}
                    onClick={async () => {
                      setPaymentMethod(method);
                      setLoading(true);
                      try {
                        const paymentTotal = Number(selectedOrderForPayment.total_amount || 0);
                        await quickPayOrder(selectedOrderForPayment.id, paymentTotal, method);
                        let realOrderNumber = selectedOrderForPayment.order_number;
                        try {
                          const { data: orderRow } = await supabase.from('orders').select('order_number').eq('id', selectedOrderForPayment.id).maybeSingle();
                          if (orderRow?.order_number) realOrderNumber = orderRow.order_number;
                        } catch (e) {}
                        setShowPaymentDialog(false);
                        setSelectedOrderForPayment(null);
                        const localReceipt = { ...selectedOrderForPayment, order_number: realOrderNumber, order_status: 'PAID' as const, payment_status: 'paid' as const } as unknown as Order;
                        setReceiptOrder(localReceipt);
                        setShowReceiptDialog(true);
                        toast({ title: '✅ Payment Successful!' });
                        loadAllOrders();
                      } catch (error: any) {
                        toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-bold">{label}</span>
                  </Button>
                ))}
              </div>
            )}

            <Separator />
            <div className="text-sm font-semibold text-muted-foreground">Split Payment</div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <Label className="text-sm">Cash Amount (OMR)</Label>
                  <Input type="number" step="0.001" min="0" placeholder="0.000" value={splitCashAmount} onChange={e => setSplitCashAmount(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <Label className="text-sm">Card Amount (OMR)</Label>
                  <Input type="number" step="0.001" min="0" placeholder="0.000" value={splitCardAmount} onChange={e => setSplitCardAmount(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-purple-600" />
                <div className="flex-1">
                  <Label className="text-sm">Mobile Amount (OMR)</Label>
                  <Input type="number" step="0.001" min="0" placeholder="0.000" value={splitMobileAmount} onChange={e => setSplitMobileAmount(e.target.value)} />
                </div>
              </div>
              <Separator />
              <div className="text-sm font-medium">
                Total: {(Number(splitCashAmount || 0) + Number(splitCardAmount || 0) + Number(splitMobileAmount || 0)).toFixed(3)} OMR
              </div>
            </div>
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
                
                const cashAmt = Number(splitCashAmount || 0);
                const cardAmt = Number(splitCardAmount || 0);
                const mobileAmt = Number(splitMobileAmount || 0);
                const splitTotal = cashAmt + cardAmt + mobileAmt;
                
                if (splitTotal < orderTotal) {
                  toast({ variant: 'destructive', title: 'Error', description: 'Split amounts must cover the total' });
                  return;
                }
                
                let orderId = selectedOrderForPayment?.id;
                
                setLoading(true);
                try {
                  if (!orderId && cart.length > 0) {
                    const batchItems = cart.map(item => ({
                      menuItem: item.menuItem,
                      quantity: item.quantity,
                      notes: item.notes,
                      isServing: item.isServing,
                      portionName: item.portionName || item.selectedPortion?.name,
                    }));
                    
                    const newOrder = await createOrder(selectedTable?.id || null, customerName || undefined);
                    orderId = newOrder.id;
                    await addOrderItemsBatch(orderId, batchItems);
                    
                    if (discount > 0) {
                      await applyDiscount(orderId, discount);
                    }
                    
                    await updateOrderStatus(orderId, 'BILL_REQUESTED');
                  }
                  
                  if (!orderId) {
                    toast({ variant: 'destructive', title: 'Error', description: 'No order to pay' });
                    setLoading(false);
                    return;
                  }
                  
                  const payments: { amount: number; payment_method: PaymentMethod }[] = [];
                  if (cashAmt > 0) payments.push({ amount: cashAmt, payment_method: 'cash' });
                  if (cardAmt > 0) payments.push({ amount: cardAmt, payment_method: 'card' });
                  if (mobileAmt > 0) payments.push({ amount: mobileAmt, payment_method: 'mobile' });
                  
                  await processSplitPayment(orderId, payments);
                  
                  if (!selectedOrderForPayment) {
                    setCart([]);
                    setDiscount(0);
                    setCustomerName('');
                  }
                  
                  setShowPaymentDialog(false);
                  setSelectedOrderForPayment(null);
                  setSplitCashAmount('');
                  setSplitCardAmount('');
                  setSplitMobileAmount('');
                  
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
              }}
              disabled={loading}
            >
              Confirm Split Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Action Bar */}
      {isMobile && view === 'menu' && cart.length > 0 && !showQuickPay && (
        <div className="fixed bottom-5 left-3 right-3 z-40 flex gap-3">
          <Button
            size="lg"
            className="flex-1 h-14 rounded-2xl font-bold mobile-gradient-orange text-white border-0 shadow-xl"
            onClick={() => { handleSendToKitchen(); }}
            disabled={cart.length === 0 || loading}
          >
            <ChefHat className="h-6 w-6 mr-2" />
            KOT
          </Button>
          <Button
            size="lg"
            className="flex-1 h-14 rounded-2xl font-bold mobile-gradient-green text-white border-0 shadow-xl"
            onClick={() => { handlePayNow(); }}
            disabled={(cart.length === 0 && !existingOrder) || loading}
          >
            <CreditCard className="h-6 w-6 mr-2" />
            PAY {grandTotal.toFixed(3)}
          </Button>
        </div>
      )}

      {/* Mobile Quick Pay Buttons */}
      {isMobile && showQuickPay && (
        <div className="fixed bottom-5 left-3 right-3 z-40 bg-card border rounded-3xl shadow-2xl p-4 space-y-3">
          <div className="text-center text-lg font-bold mb-2">Pay {grandTotal.toFixed(3)} OMR</div>
          <div className="grid grid-cols-3 gap-3">
            <Button
              size="lg"
              className="flex-col gap-2 h-20 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg"
              onClick={() => handleQuickPay('cash')}
              disabled={loading}
            >
              <Banknote className="h-8 w-8" />
              <span className="text-sm font-bold">Cash</span>
            </Button>
            <Button
              size="lg"
              className="flex-col gap-2 h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg"
              onClick={() => handleQuickPay('card')}
              disabled={loading}
            >
              <CreditCard className="h-8 w-8" />
              <span className="text-sm font-bold">Card</span>
            </Button>
            <Button
              size="lg"
              className="flex-col gap-2 h-20 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-lg"
              onClick={() => handleQuickPay('mobile')}
              disabled={loading}
            >
              <Smartphone className="h-8 w-8" />
              <span className="text-sm font-bold">Mobile</span>
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="flex-1 text-sm h-12 rounded-xl" onClick={() => setShowQuickPay(false)}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-sm h-12 rounded-xl" onClick={() => { setShowQuickPay(false); setShowPaymentDialog(true); }}>
              Split Payment
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Cart Floating Button */}
      {isMobile && (view === 'tables' || view === 'menu') && (
        <button
          className="fixed bottom-5 right-5 z-50 bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center shadow-xl mobile-card-shadow"
          onClick={() => setShowMobileCart(true)}
        >
          <ShoppingCart className="h-7 w-7" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {cart.length}
            </span>
          )}
        </button>
      )}

      {/* Mobile Cart Sheet */}
      <Sheet open={showMobileCart} onOpenChange={setShowMobileCart}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-3xl">
          <SheetHeader className="p-4 border-b mobile-gradient-restaurant">
            <SheetTitle className="flex items-center gap-2 text-white">
              <ShoppingCart className="h-5 w-5" />
              Current Order {selectedTable && `- ${selectedTable.table_number}`}
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 py-2 border-b">
            <Input
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="px-4 py-2 border-b">
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

          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">TICKET IS EMPTY</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div key={`mobile-${item.menuItem.id}-${idx}`} className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.menuItem.name}</p>
                      <p className="text-xs text-muted-foreground">{item.menuItem.price.toFixed(3)} OMR each</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="icon" variant="outline" className="h-10 w-10 rounded-full" onClick={() => updateCartQuantity(item.menuItem.id, item.isServing, -1, item.selectedPortion)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center text-lg font-bold">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-10 w-10 rounded-full" onClick={() => updateCartQuantity(item.menuItem.id, item.isServing, 1, item.selectedPortion)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-10 w-10 rounded-full text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => removeFromCart(item.menuItem.id, item.isServing, item.selectedPortion)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-4 space-y-2">
            {!isFOC && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Discount</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-32 h-7 text-right font-mono text-sm"
                  onClick={() => showKeypad('Enter Discount', discount?.toString() || '', (value) => setDiscount(Math.max(0, parseFloat(value) || 0)))}
                >
                  {discount?.toFixed(3) || '0.000'}
                </Button>
              </div>
            )}
            {!isFOC && discount > 0 && (
              <div className="flex justify-between text-sm text-green-500">
                <span>Discount Applied</span>
                <span>-{discount.toFixed(3)} OMR</span>
              </div>
            )}

            {/* FOC Toggle */}
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="text-muted-foreground text-sm">🎁 FOC (Free)</span>
              <Button
                variant={isFOC ? 'default' : 'outline'}
                size="sm"
                className={`h-7 text-xs ${isFOC ? 'bg-green-600 hover:bg-green-700' : ''}`}
                onClick={() => {
                  setIsFOC(!isFOC);
                  if (!isFOC) setDiscount(0);
                }}
              >
                {isFOC ? 'FOC ON' : 'FOC OFF'}
              </Button>
            </div>
            {isFOC && (
              <Input
                placeholder="Person Name (required)"
                value={focDancerName}
                onChange={(e) => setFocDancerName(e.target.value)}
                className="h-7 text-sm"
              />
            )}
            {isFOC && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>FOC - Full Discount</span>
                <span>-{(existingTotal + subtotal).toFixed(3)} OMR</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{grandTotal.toFixed(3)} OMR</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {isFOC ? (
                <Button size="lg" className="col-span-2 bg-green-600 hover:bg-green-700 h-16 text-lg rounded-2xl font-bold" onClick={() => { setShowMobileCart(false); handleFOCConfirm(); }} disabled={(cart.length === 0 && !existingOrder?.order_items?.length) || !focDancerName.trim() || loading}>
                  🎁 CONFIRM FOC
                </Button>
              ) : (
                <>
                  <Button variant="secondary" size="lg" className="h-16 text-lg rounded-2xl font-bold mobile-gradient-orange text-white border-0" onClick={() => { setShowMobileCart(false); handleSendToKitchen(); }} disabled={cart.length === 0 || loading}>
                    <ChefHat className="h-6 w-6 mr-2" />KOT
                  </Button>
                  <Button size="lg" className="h-16 text-lg rounded-2xl font-bold mobile-gradient-green text-white border-0" onClick={() => { setShowMobileCart(false); handlePayNow(); }} disabled={(cart.length === 0 && !existingOrder) || loading}>
                    <CreditCard className="h-6 w-6 mr-2" />PAY
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Held Bills Sheet */}
      <Sheet open={showHeldBills} onOpenChange={setShowHeldBills}>
        <SheetContent side="right" className="w-[320px]">
          <SheetHeader>
            <SheetTitle>Held Bills</SheetTitle>
            <p className="text-sm text-muted-foreground">Tap to recall or delete</p>
          </SheetHeader>
          <div className="p-4 space-y-2">
            {heldBills.length === 0 ? (
              <div className="text-sm text-muted-foreground">No held bills yet</div>
            ) : (
              heldBills.map(hold => (
                <div key={hold.id} className="flex justify-between items-start bg-muted/70 rounded-lg p-3">
                  <div>
                    <div className="font-semibold text-sm">{hold.name}</div>
                    <div className="text-xs text-muted-foreground">{hold.cart.length} items - {hold.orderType}</div>
                    <div className="text-xs text-muted-foreground">Session: {hold.session}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="xs" onClick={() => { handleRecallBill(hold); setShowHeldBills(false); }}>Recall</Button>
                    <Button size="xs" variant="destructive" onClick={() => setHeldBills(prev => prev.filter(h => h.id !== hold.id))}>Delete</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Receipt Dialog */}
      {receiptOrder && (
        <ReceiptDialog
          order={receiptOrder}
          open={showReceiptDialog}
          onOpenChange={setShowReceiptDialog}
          autoPrint={true}
        />
      )}

      {/* Portion Selection Dialog */}
      <PortionSelectionDialog
        open={showServingDialog}
        onOpenChange={setShowServingDialog}
        item={selectedServingItem}
        onSelect={handlePortionSelect}
      />

      {/* Numeric Keypad Dialog */}
      <Dialog open={showNumericKeypad} onOpenChange={setShowNumericKeypad}>
        <DialogContent className="max-w-md p-0">
          <NumericKeypad
            value={keypadValue}
            onChange={setKeypadValue}
            onSubmit={handleKeypadSubmit}
            onCancel={handleKeypadCancel}
            title={keypadTitle}
            showSubmit={true}
            showCancel={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
