import React, { useState, useMemo } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { useCategories, useMenuItems } from '@/hooks/useMenuData';
import MenuItemCard from './MenuItemCard';
import CategoryTabBar from './CategoryTabBar';
import MenuPagination from './MenuPagination';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { MenuItem } from '@/types/pos';

interface POSMenuPanelProps {
  showCategoriesOnly?: boolean;
  compact?: boolean;
}

export default function POSMenuPanel({
  showCategoriesOnly,
  compact,
}: POSMenuPanelProps) {
  const { selectedCategory, setSelectedCategory, currentPage, setCurrentPage, searchQuery, setSearchQuery } =
    usePOSContext();
  const { data: categories = [] } = useCategories();
  const { data: items = [] } = useMenuItems(selectedCategory);

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

  if (showCategoriesOnly) {
    return (
      <div className="p-3">
        <CategoryTabBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search Bar */}
      <div className="flex-shrink-0 p-3 border-b space-y-3">
        <CategoryTabBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            className="pl-8 h-8 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Menu Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground">Loading menu...</div>
        ) : paginatedItems.length === 0 ? (
          <div className="text-center text-muted-foreground">No items found</div>
        ) : (
          <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'}`}>
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
