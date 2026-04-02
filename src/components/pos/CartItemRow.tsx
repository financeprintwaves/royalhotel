import React from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { CartItem } from '@/types/pos';

interface CartItemRowProps {
  item: CartItem;
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const { removeCartItem, updateCartItem } = usePOSContext();

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    updateCartItem(item.id, { quantity: newQty });
  };

  const itemTotal = item.menuItem.price * item.quantity;

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-all duration-200 group">
      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-900 dark:text-white truncate text-sm">{item.menuItem.description}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span className="text-green-600 dark:text-green-400 font-semibold">${item.menuItem.price.toFixed(2)}</span>
          <span className="mx-1.5">×</span>
          <span className="font-semibold">{item.quantity}</span>
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-600 font-bold"
          onClick={() => handleQuantityChange(-1)}
        >
          −
        </Button>
        <span className="w-6 text-center text-sm font-bold text-gray-900 dark:text-white">{item.quantity}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-600 font-bold"
          onClick={() => handleQuantityChange(1)}
        >
          +
        </Button>
      </div>

      {/* Item Total */}
      <div className="text-right min-w-14">
        <div className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">${itemTotal.toFixed(2)}</div>
      </div>

      {/* Remove Button */}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        onClick={() => removeCartItem(item.id)}
        title="Remove item"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
