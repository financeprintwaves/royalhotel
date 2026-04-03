import React from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import CartItemRow from './CartItemRow';
import { ShoppingCart } from 'lucide-react';

export default function POSOrderPanel() {
  const { cartItems } = usePOSContext();

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No items in cart</p>
        <p className="text-xs mt-1 opacity-60">Select items from menu</p>
      </div>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <div className="flex flex-col h-full">
      {/* Cart items */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {cartItems.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </div>

      {/* Totals */}
      <div className="mt-3 pt-3 border-t border-slate-700 space-y-1.5 text-sm">
        <div className="flex justify-between text-slate-400">
          <span>Subtotal</span>
          <span className="tabular-nums">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Tax (10%)</span>
          <span className="tabular-nums text-amber-400">${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-white font-bold text-lg pt-1">
          <span>Total</span>
          <span className="tabular-nums">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
