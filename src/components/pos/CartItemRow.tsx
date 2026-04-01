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

  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-card border rounded text-sm">
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground">
          ${item.unit_price.toFixed(2)} × {item.quantity}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-6 w-6 p-0"
          onClick={() => handleQuantityChange(-1)}
        >
          −
        </Button>
        <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-6 w-6 p-0"
          onClick={() => handleQuantityChange(1)}
        >
          +
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
          onClick={() => removeCartItem(item.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="text-right font-semibold">
        ${(item.unit_price * item.quantity).toFixed(2)}
      </div>
    </div>
  );
}
