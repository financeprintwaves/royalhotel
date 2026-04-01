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
      className="p-3 cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full"
      onClick={handleAddToCart}
    >
      {/* Image or Icon */}
      <div className="w-full h-20 bg-gradient-to-br from-blue-400 to-purple-400 rounded mb-2 flex items-center justify-center text-2xl">
        {item.icon || '🍽️'}
      </div>

      {/* Content */}
      <div className="flex-1">
        <h4 className="font-semibold text-sm line-clamp-2">{item.description}</h4>
        {item.is_favorite && (
          <span className="inline-block text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded mt-1">
            ⭐ Favorite
          </span>
        )}
        {item.is_daily_special && (
          <span className="inline-block text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded mt-1 ml-1">
            🌟 Special
          </span>
        )}
      </div>

      {/* Price */}
      <div className="mt-2 pt-2 border-t">
        <div className="text-lg font-bold text-green-600">
          ${item.price.toFixed(2)}
        </div>
      </div>

      {/* Add Button */}
      <Button
        size="sm"
        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
        onClick={handleAddToCart}
      >
        Add to Cart
      </Button>
    </Card>
  );
}
