import React from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { Minus, Plus, X } from 'lucide-react';
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
    <div className="flex items-center gap-2 py-2 px-3 bg-slate-800 rounded-md group hover:bg-slate-750 transition-colors">
      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{item.menuItem.name}</div>
        <div className="text-xs text-slate-400 tabular-nums">
          ${item.menuItem.price.toFixed(2)} × {item.quantity}
        </div>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1 bg-slate-700 rounded px-1 py-0.5">
        <button
          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-600 rounded transition-colors"
          onClick={() => handleQuantityChange(-1)}
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-6 text-center text-xs font-bold text-white tabular-nums">{item.quantity}</span>
        <button
          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-600 rounded transition-colors"
          onClick={() => handleQuantityChange(1)}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Total */}
      <div className="text-sm font-bold text-emerald-400 tabular-nums min-w-[60px] text-right">
        ${itemTotal.toFixed(2)}
      </div>

      {/* Remove */}
      <button
        className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        onClick={() => removeCartItem(item.id)}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
