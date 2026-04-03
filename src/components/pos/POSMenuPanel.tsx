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

export default function POSMenuPanel({ compact }: POSMenuPanelProps) {
  const { selectedCategory, setSelectedCategory, currentPage, setCurrentPage, searchQuery, setSearchQuery } =
    usePOSContext();
  const { data: categories = [] } = useCategories();
  const { data: items = [] } = useMenuItems(selectedCategory);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    let filtered = items || [];
    if (selectedCategory) {
      filtered = filtered.filter((item: MenuItem) => item.category_id === selectedCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item: MenuItem) =>
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [items, selectedCategory, searchQuery]);

  const itemsPerPage = compact ? 8 : 18;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, setCurrentPage]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900">
      {/* Categories */}
      <div className="flex-shrink-0 border-b border-slate-700 flex items-center bg-slate-800">
        <button
          onClick={() => categoryScrollRef.current?.scrollBy({ left: -120, behavior: 'smooth' })}
          className="flex-shrink-0 px-2 py-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={categoryScrollRef} style={{ scrollBehavior: 'smooth' }}>
          <div className="flex gap-1 p-1.5 min-w-min">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-3 py-1.5 font-medium rounded text-xs uppercase tracking-wide transition-colors whitespace-nowrap ${
                selectedCategory === null
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
            >
              All
            </button>
            {categories?.map((cat: Category) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 font-medium rounded text-xs uppercase tracking-wide transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => categoryScrollRef.current?.scrollBy({ left: 120, behavior: 'smooth' })}
          className="flex-shrink-0 px-2 py-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 p-2 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search menu..."
            className="pl-8 h-9 text-sm bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Menu Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading menu...</div>
        ) : paginatedItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">No items found</div>
        ) : (
          <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
            {paginatedItems.map((item: MenuItem) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 border-t border-slate-700 p-2">
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
