import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCategories, getMenuItems } from '@/services/menuService';
import { getTables } from '@/services/tableService';
import { getAllBranches } from '@/services/staffService';
import { localCache, CACHE_KEYS, CACHE_DURATION } from '@/services/cacheService';
import { cacheMenuItems, getCachedMenuItems, cacheCategories, getCachedCategories } from '@/services/localDb';
import type { Category, MenuItem, RestaurantTable, Branch } from '@/types/pos';

// Hook for categories with local caching and branch filtering
export function useCategories(branchId?: string) {
  return useQuery({
    queryKey: ['categories', branchId],
    queryFn: async (): Promise<Category[]> => {
      // Try Dexie first (instant)
      const dexieCached = await getCachedCategories(branchId);
      if (dexieCached && dexieCached.length > 0) {
        // Background refresh from server
        getCategories(branchId).then(data => {
          cacheCategories(data, branchId);
        }).catch(() => {});
        return dexieCached;
      }

      const data = await getCategories(branchId);
      cacheCategories(data, branchId);
      return data;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Hook for menu items with local caching and branch filtering
export function useMenuItems(categoryId?: string, branchId?: string) {
  return useQuery({
    queryKey: ['menu_items', categoryId, branchId],
    queryFn: async (): Promise<MenuItem[]> => {
      // Try Dexie first (instant)
      const dexieCached = await getCachedMenuItems(categoryId, branchId);
      if (dexieCached && dexieCached.length > 0) {
        // Background refresh from server
        getMenuItems(categoryId, branchId).then(data => {
          cacheMenuItems(data, branchId);
        }).catch(() => {});
        return dexieCached;
      }

      const data = await getMenuItems(categoryId, branchId);
      cacheMenuItems(data, branchId);
      return data;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Hook for tables with local caching
export function useTables(branchId?: string) {
  return useQuery({
    queryKey: ['tables', branchId],
    queryFn: async (): Promise<RestaurantTable[]> => {
      const cacheKey = branchId 
        ? `${CACHE_KEYS.TABLES}_${branchId}` 
        : CACHE_KEYS.TABLES;
      
      // Check local cache first
      const cached = localCache.get<RestaurantTable[]>(cacheKey);
      if (cached) {
        console.log('Tables loaded from cache');
        return cached;
      }
      
      // Fetch from database
      const data = await getTables(branchId);
      
      // Store in local cache
      localCache.set(cacheKey, data, CACHE_DURATION.TABLES);
      
      return data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Hook for branches with local caching
export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async (): Promise<Branch[]> => {
      // Check local cache first
      const cached = localCache.get<Branch[]>(CACHE_KEYS.BRANCHES);
      if (cached) {
        console.log('Branches loaded from cache');
        return cached;
      }
      
      // Fetch from database
      const data = await getAllBranches();
      
      // Store in local cache
      localCache.set(CACHE_KEYS.BRANCHES, data, CACHE_DURATION.BRANCHES);
      
      return data;
    },
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Hook to refresh all cached data
export function useRefreshCache() {
  const queryClient = useQueryClient();
  
  return {
    refreshAll: () => {
      localCache.clear();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    refreshMenu: () => {
      localCache.clear(CACHE_KEYS.MENU_ITEMS);
      localCache.clear(CACHE_KEYS.CATEGORIES);
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    refreshTables: () => {
      localCache.clear(CACHE_KEYS.TABLES);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  };
}
