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
      className="overflow-hidden cursor-pointer flex flex-col h-full bg-blue-700 border border-blue-600 group hover:bg-blue-600 transition-colors"
      onClick={handleAddToCart}
    >
      {/* Image or Icon - Simple Background */}
      <div className="w-full h-40 bg-blue-600 flex items-center justify-center text-5xl relative overflow-hidden">
        <div className="relative z-10">{item.icon || '🍽️'}</div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col bg-blue-700">
        <h4 className="font-bold text-lg line-clamp-2 text-white mb-2">{item.description}</h4>
        {item.is_favorite && (
          <span className="inline-flex items-center text-sm bg-blue-500 text-blue-100 px-3 py-1 rounded font-semibold mb-2 w-fit">
            ⭐ Favorite
          </span>
        )}
        {item.is_daily_special && (
          <span className="inline-flex items-center text-sm bg-blue-500 text-blue-100 px-3 py-1 rounded font-semibold w-fit">
            🌟 Special
          </span>
        )}
      </div>

      {/* Price Section */}
      <div className="px-4 py-3 border-t border-blue-600 bg-blue-700">
        <div className="text-3xl font-bold text-white">
          ${item.price.toFixed(2)}
        </div>
      </div>

      {/* Add Button */}
      <Button
        className="w-full m-3 mt-0 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg py-3 rounded transition-colors duration-200 uppercase tracking-wider"
        onClick={handleAddToCart}
      >
        + Add to Cart
      </Button>
    </Card>
  );
}
