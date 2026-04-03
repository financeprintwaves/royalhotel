import React, { createContext, useContext, useState, useCallback } from 'react';
import { CartItem, Order } from '@/types/pos';

interface POSContextType {
  // Order & Cart
  currentOrder: Partial<Order> | null;
  cartItems: CartItem[];
  
  // Table/Type Selection
  selectedTableId: string | null;
  selectedTableName: string | null;
  orderType: 'dine-in' | 'takeout' | 'delivery' | null;
  
  // Menu Navigation
  selectedCategory: string | null;
  currentPage: number;
  itemsPerPage: number;
  searchQuery: string;
  
  // Payment
  paymentMethod: 'cash' | 'card' | 'transfer' | 'split' | null;
  amountPaid: number;
  tipAmount: number;
  
  // Held Orders
  heldOrders: Order[];
  
  // State Setters
  setCurrentOrder: (order: Partial<Order> | null) => void;
  setCartItems: (items: CartItem[]) => void;
  addCartItem: (item: CartItem) => void;
  removeCartItem: (itemId: string) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  
  setSelectedTable: (tableId: string | null, tableName: string | null) => void;
  setOrderType: (type: 'dine-in' | 'takeout' | 'delivery' | null) => void;
  
  setSelectedCategory: (categoryId: string | null) => void;
  setCurrentPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
  
  setPaymentMethod: (method: 'cash' | 'card' | 'transfer' | 'split' | null) => void;
  setAmountPaid: (amount: number) => void;
  setTipAmount: (tip: number) => void;
  
  setHeldOrders: (orders: Order[]) => void;
  addHeldOrder: (order: Order) => void;
  
  // Calculations
  getOrderTotal: () => number;
  getOrderTax: () => number;
  getOrderSubtotal: () => number;
  getBalanceRemaining: () => number;
  getChange: () => number;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentOrder, setCurrentOrder] = useState<Partial<Order> | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedTableId, setSelectedTableIdState] = useState<string | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeout' | 'delivery' | null>('dine-in');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'split' | null>(null);
  const [amountPaid, setAmountPaid] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [heldOrders, setHeldOrders] = useState<Order[]>([]);

  const itemsPerPage = 12;

  const addCartItem = useCallback((item: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeCartItem = useCallback((itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const updateCartItem = useCallback((itemId: string, updates: Partial<CartItem>) => {
    setCartItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const setSelectedTable = useCallback((tableId: string | null, tableName: string | null) => {
    setSelectedTableIdState(tableId);
    setSelectedTableName(tableName);
  }, []);

  const getOrderSubtotal = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  }, [cartItems]);

  const getOrderTax = useCallback(() => {
    return getOrderSubtotal() * 0.1;
  }, [getOrderSubtotal]);

  const getOrderTotal = useCallback(() => {
    const subtotal = getOrderSubtotal();
    const tax = getOrderTax();
    const discount = currentOrder?.discount_amount || 0;
    return subtotal + tax - discount;
  }, [currentOrder, getOrderSubtotal, getOrderTax]);

  const getBalanceRemaining = useCallback(() => {
    return Math.max(0, getOrderTotal() - amountPaid);
  }, [amountPaid, getOrderTotal]);

  const getChange = useCallback(() => {
    return Math.max(0, amountPaid - getOrderTotal());
  }, [amountPaid, getOrderTotal]);

  const addHeldOrder = useCallback((order: Order) => {
    setHeldOrders((prev) => [...prev, order]);
  }, []);

  const value: POSContextType = {
    currentOrder, cartItems, selectedTableId, selectedTableName, orderType,
    selectedCategory, currentPage, itemsPerPage, searchQuery,
    paymentMethod, amountPaid, tipAmount, heldOrders,
    setCurrentOrder, setCartItems, addCartItem, removeCartItem, updateCartItem, clearCart,
    setSelectedTable, setOrderType, setSelectedCategory, setCurrentPage, setSearchQuery,
    setPaymentMethod, setAmountPaid, setTipAmount, setHeldOrders, addHeldOrder,
    getOrderTotal, getOrderTax, getOrderSubtotal, getBalanceRemaining, getChange,
  };

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
};

export const usePOSContext = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOSContext must be used within POSProvider');
  }
  return context;
};
