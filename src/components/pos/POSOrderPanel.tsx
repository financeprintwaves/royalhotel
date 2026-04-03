import React from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import CartItemRow from './CartItemRow';
import { Card } from '@/components/ui/card';

export default function POSOrderPanel() {
  const { cartItems } = usePOSContext();

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg">
        <div className="text-6xl mb-4 opacity-20">🛒</div>
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Items in Cart</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Select items from menu to begin order</p>
      </div>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-slate-700 px-4 py-3 text-white">
        <h3 className="font-bold text-lg">📋 Order Summary</h3>
        <p className="text-slate-300 text-xs mt-1">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in order</p>
      </div>

      {/* Order Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {cartItems.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700"></div>

      {/* Totals Section */}
      <div className="p-4 space-y-3 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
        {/* Subtotal */}
        <div className="flex justify-between items-center px-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">${subtotal.toFixed(2)}</span>
        </div>

        {/* Tax */}
        <div className="flex justify-between items-center px-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tax (10%):</span>
          <span className="text-lg font-bold text-orange-600 dark:text-orange-400">${tax.toFixed(2)}</span>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-slate-300 to-slate-300 dark:from-slate-600 to-slate-600"></div>

        {/* Total */}
        <div className="flex justify-between items-center px-2 py-2 bg-slate-700 rounded-lg">
          <span className="text-base font-bold text-white">TOTAL:</span>
          <span className="text-3xl font-bold text-white">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
