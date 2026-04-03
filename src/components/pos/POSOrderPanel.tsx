import React from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import CartItemRow from './CartItemRow';
import { Card } from '@/components/ui/card';

export default function POSOrderPanel() {
  const { cartItems } = usePOSContext();

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg">
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
    <div className="flex flex-col h-full bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-blue-700 px-4 py-3 text-white">
        <h3 className="font-bold text-lg">📋 Order Summary</h3>
        <p className="text-blue-300 text-sm mt-1">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in order</p>
      </div>

      {/* Order Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cartItems.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700"></div>

      {/* Totals Section */}
      <div className="p-4 space-y-4 bg-gradient-to-b from-white to-blue-50 dark:from-blue-800 dark:to-blue-900">
        {/* Subtotal */}
        <div className="flex justify-between items-center px-2">
          <span className="text-base font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
          <span className="text-xl font-bold text-gray-900 dark:text-white">${subtotal.toFixed(2)}</span>
        </div>

        {/* Tax */}
        <div className="flex justify-between items-center px-2">
          <span className="text-base font-medium text-gray-700 dark:text-gray-300">Tax (10%):</span>
          <span className="text-xl font-bold text-orange-600 dark:text-orange-400">${tax.toFixed(2)}</span>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-blue-300 to-blue-300 dark:from-blue-600 to-blue-600"></div>

        {/* Total */}
        <div className="flex justify-between items-center px-2 py-3 bg-blue-700 rounded-lg">
          <span className="text-lg font-bold text-white">TOTAL:</span>
          <span className="text-4xl font-bold text-white">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
