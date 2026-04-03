import React, { useCallback } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 flex flex-col h-full bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 border border-slate-700 dark:border-slate-700 group"
      onClick={handleAddToCart}
    >
      {/* Image or Icon - Neutral Background */}
      <div className="w-full h-32 bg-slate-700 flex items-center justify-center text-5xl relative overflow-hidden">
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
        <div className="relative z-10">{item.icon || '🍽️'}</div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col bg-gradient-to-b from-slate-850 to-slate-900">
        <h4 className="font-bold text-base line-clamp-2 text-white mb-2">{item.description}</h4>
        {item.is_favorite && (
          <span className="inline-flex items-center text-xs bg-slate-600 text-slate-200 px-3 py-1 rounded-full font-semibold mb-2 w-fit border border-slate-500">
            ⭐ Favorite
          </span>
        )}
        {item.is_daily_special && (
          <span className="inline-flex items-center text-xs bg-slate-600 text-slate-200 px-3 py-1 rounded-full font-semibold w-fit border border-slate-500">
            🌟 Special
          </span>
        )}
      </div>

      {/* Price Section */}
      <div className="px-4 py-3 border-t border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="text-3xl font-black text-white">
          ${item.price.toFixed(2)}
        </div>
      </div>

      {/* Add Button */}
      <Button
        className="w-full m-3 mt-0 bg-slate-700 hover:bg-slate-600 text-white font-black text-sm py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 uppercase tracking-wider drop-shadow transform hover:scale-105 active:scale-95"
        onClick={handleAddToCart}
      >
        + Add to Cart
      </Button>
    </Card>
  );
}
