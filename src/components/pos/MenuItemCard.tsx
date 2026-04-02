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
      className="overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 flex flex-col h-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700"
      onClick={handleAddToCart}
    >
      {/* Image or Icon - Premium Gradient */}
      <div className="w-full h-24 bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 flex items-center justify-center text-4xl relative overflow-hidden">
        {item.icon || '🍽️'}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        <h4 className="font-bold text-sm line-clamp-2 text-gray-900 dark:text-white mb-2">{item.description}</h4>
        {item.is_favorite && (
          <span className="inline-flex items-center text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 dark:from-green-900 dark:to-emerald-900 dark:text-green-200 px-3 py-1 rounded-full font-semibold mb-2 w-fit">
            ⭐ Favorite
          </span>
        )}
        {item.is_daily_special && (
          <span className="inline-flex items-center text-xs bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 dark:from-orange-900 dark:to-amber-900 dark:text-orange-200 px-3 py-1 rounded-full font-semibold w-fit">
            🌟 Special
          </span>
        )}
      </div>

      {/* Price Section */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
        <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
          ${item.price.toFixed(2)}
        </div>
      </div>

      {/* Add Button */}
      <Button
        className="w-full m-3 mt-0 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 uppercase tracking-wide"
        onClick={handleAddToCart}
      >
        + Add to Cart
      </Button>
    </Card>
  );
}
