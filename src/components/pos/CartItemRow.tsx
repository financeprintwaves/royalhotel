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
    <div className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border border-slate-700 rounded-lg hover:shadow-lg transition-all duration-300 group hover:from-slate-750 hover:via-slate-800">
      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white truncate text-sm">{item.menuItem.description}</div>
        <div className="text-xs text-slate-400 mt-1">
          <span className="text-cyan-400 font-semibold">${item.menuItem.price.toFixed(2)}</span>
          <span className="mx-1.5 text-slate-500">×</span>
          <span className="font-semibold text-slate-300">{item.quantity}</span>
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-1.5 bg-slate-700/50 rounded-lg p-1 border border-slate-600/50">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-slate-300 hover:bg-blue-600/30 hover:text-cyan-300 font-bold transition-colors"
          onClick={() => handleQuantityChange(-1)}
        >
          −
        </Button>
        <span className="w-6 text-center text-sm font-bold text-white">{item.quantity}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-slate-300 hover:bg-blue-600/30 hover:text-cyan-300 font-bold transition-colors"
          onClick={() => handleQuantityChange(1)}
        >
          +
        </Button>
      </div>

      {/* Item Total */}
      <div className="text-right min-w-16">
        <div className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 drop-shadow-sm">${itemTotal.toFixed(2)}</div>
      </div>

      {/* Remove Button */}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-slate-500 hover:bg-red-600/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
        onClick={() => removeCartItem(item.id)}
        title="Remove item"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
