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
      <TabsList className="grid w-full gap-2 bg-transparent p-0 h-auto">
        <TabsTrigger
          value="all"
          className="text-sm h-10 px-4 py-2 font-semibold rounded-lg transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          All
        </TabsTrigger>
        {categories?.map((cat: Category) => (
          <TabsTrigger
            key={cat.id}
            value={cat.id}
            className="text-sm h-10 px-4 py-2 font-semibold rounded-lg transition-all duration-200 truncate data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {cat.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
