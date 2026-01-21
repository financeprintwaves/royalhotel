// Local cache service for static data to reduce database calls

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

class LocalCache {
  private prefix = 'pos_cache_';

  // Save to localStorage with expiry
  set<T>(key: string, data: T, expiresInMinutes: number = 60): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMinutes * 60 * 1000,
    };
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (e) {
      console.warn('Failed to cache data:', e);
    }
  }

  // Get from localStorage, return null if expired
  get<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
      
      if (isExpired) {
        this.clear(key);
        return null;
      }
      
      return entry.data;
    } catch (e) {
      return null;
    }
  }

  // Check if cache exists and is valid
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Clear specific cache or all pos caches
  clear(key?: string): void {
    if (key) {
      localStorage.removeItem(this.prefix + key);
    } else {
      // Clear all pos caches
      const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
      keys.forEach(k => localStorage.removeItem(k));
    }
  }

  // Get cache age in seconds
  getAge(key: string): number | null {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return null;
      const entry = JSON.parse(stored);
      return Math.floor((Date.now() - entry.timestamp) / 1000);
    } catch {
      return null;
    }
  }
}

export const localCache = new LocalCache();

// Cache keys
export const CACHE_KEYS = {
  MENU_ITEMS: 'menu_items',
  CATEGORIES: 'categories',
  TABLES: 'tables',
  BRANCHES: 'branches',
} as const;

// Cache durations in minutes
export const CACHE_DURATION = {
  MENU_ITEMS: 60,    // 1 hour - menu rarely changes during shift
  CATEGORIES: 60,    // 1 hour
  TABLES: 15,        // 15 minutes - table config may change
  BRANCHES: 120,     // 2 hours - almost never changes
} as const;
