import React, { useState, useMemo, useRef } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { useCategories, useMenuItems } from '@/hooks/useMenuData';
import MenuItemCard from './MenuItemCard';
import MenuPagination from './MenuPagination';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MenuItem, Category } from '@/types/pos';

interface POSMenuPanelProps {
  compact?: boolean;
}

export default function POSMenuPanel({
  compact,
}: POSMenuPanelProps) {
  const { selectedCategory, setSelectedCategory, currentPage, setCurrentPage, searchQuery, setSearchQuery } =
    usePOSContext();
  const { data: categories = [] } = useCategories();
  const { data: items = [] } = useMenuItems(selectedCategory);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    let filtered = items || [];

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((item: MenuItem) => item.category_id === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item: MenuItem) =>
          item.description?.toLowerCase().includes(query) ||
          item.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, selectedCategory, searchQuery]);

  const itemsPerPage = 12;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when category changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, setCurrentPage]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Categories - Horizontal Scrollable with Arrow Buttons */}
      <div className="flex-shrink-0 border-b border-slate-700 bg-slate-800 flex items-center">
        <button
          onClick={() => categoryScrollRef.current?.scrollBy({ left: -100, behavior: 'smooth' })}
          className="flex-shrink-0 px-2 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors duration-200"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={categoryScrollRef} style={{ scrollBehavior: 'smooth' }}>
          <div className="flex gap-1 p-1 min-w-min">
            {/* All button */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-3 py-2 font-semibold rounded text-xs uppercase tracking-wider transition-colors duration-200 whitespace-nowrap ${
                selectedCategory === null
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
            >
              ALL
            </button>
            {/* Category buttons */}
            {categories?.map((cat: Category) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-3 py-2 font-semibold rounded text-xs uppercase tracking-wider transition-colors duration-200 whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => categoryScrollRef.current?.scrollBy({ left: 100, behavior: 'smooth' })}
          className="flex-shrink-0 px-2 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors duration-200"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex-shrink-0 p-2 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search..."
            className="pl-8 h-8 text-xs bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Menu Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground">Loading menu...</div>
        ) : paginatedItems.length === 0 ? (
          <div className="text-center text-muted-foreground">No items found</div>
        ) : (
          <div className={`grid gap-1 ${compact ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {paginatedItems.map((item: MenuItem) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 border-t p-3">
          <MenuPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage(Math.max(1, currentPage - 1))}
            onNext={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          />
        </div>
      )}
    </div>
  );
}
