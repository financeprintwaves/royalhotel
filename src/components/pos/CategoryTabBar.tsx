import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Category } from '@/types/pos';

interface CategoryTabBarProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export default function CategoryTabBar({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryTabBarProps) {
  return (
    <Tabs
      value={selectedCategory || 'all'}
      onValueChange={(value) => onSelectCategory(value === 'all' ? null : value)}
      className="w-full"
    >
      <TabsList className="grid w-full gap-1 bg-transparent p-0">
        <TabsTrigger
          value="all"
          className="text-xs h-8 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
        >
          All
        </TabsTrigger>
        {categories?.map((cat: Category) => (
          <TabsTrigger
            key={cat.id}
            value={cat.id}
            className="text-xs h-8 data-[state=active]:bg-blue-600 data-[state=active]:text-white truncate"
          >
            {cat.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
