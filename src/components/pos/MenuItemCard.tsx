import React, { useCallback } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { Plus } from 'lucide-react';
import type { MenuItem } from '@/types/pos';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const { addCartItem } = usePOSContext();

  const handleAddToCart = useCallback(() => {
    addCartItem({
      id: `${item.id}-${Date.now()}`,
      menuItem: item,
      quantity: 1,
    });
  }, [item, addCartItem]);

  return (
    <button
      onClick={handleAddToCart}
      className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:border-slate-600 transition-all duration-150 text-left group w-full"
    >
      {/* Image thumbnail */}
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.name}
          className="w-12 h-12 rounded-md object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-md bg-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0 text-lg">
          🍽
        </div>
      )}

      {/* Name & description */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-white truncate">{item.name}</div>
        {item.description && (
          <div className="text-xs text-slate-400 truncate">{item.description}</div>
        )}
      </div>

      {/* Price */}
      <div className="text-sm font-bold text-emerald-400 flex-shrink-0 tabular-nums">
        ${item.price.toFixed(2)}
      </div>

      {/* Add icon */}
      <div className="w-7 h-7 rounded-md bg-emerald-600 group-hover:bg-emerald-500 flex items-center justify-center flex-shrink-0 transition-colors">
        <Plus className="w-4 h-4 text-white" />
      </div>
    </button>
  );
}
