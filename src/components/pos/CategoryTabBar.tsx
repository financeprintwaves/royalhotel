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
      <TabsList className="grid w-full gap-2 bg-transparent p-4 h-auto border-b border-slate-700 bg-gradient-to-b from-slate-800 to-slate-850">
        <TabsTrigger
          value="all"
          className="text-sm h-11 px-4 py-2 font-bold rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:via-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-slate-700/50 text-slate-300 hover:text-white dark:hover:bg-slate-700 uppercase tracking-wider"
        >
          ALL
        </TabsTrigger>
        {categories?.map((cat: Category) => (
          <TabsTrigger
            key={cat.id}
            value={cat.id}
            className="text-sm h-11 px-4 py-2 font-bold rounded-lg transition-all duration-300 truncate data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:via-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-slate-700/50 text-slate-300 hover:text-white dark:hover:bg-slate-700 uppercase tracking-wider"
          >
            {cat.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
