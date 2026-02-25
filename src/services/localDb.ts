import Dexie, { type Table } from 'dexie';
import type { Category, MenuItem, CartItem } from '@/types/pos';

// Local IndexedDB database for offline-first speed
class PosLocalDb extends Dexie {
  menuItems!: Table<MenuItem & { _cachedAt: number }, string>;
  categories!: Table<Category & { _cachedAt: number }, string>;
  cartDrafts!: Table<{ id: string; branchId: string; cart: CartItem[]; updatedAt: number }, string>;

  constructor() {
    super('pos_local_db');
    this.version(1).stores({
      menuItems: 'id, category_id, branch_id',
      categories: 'id, branch_id',
      cartDrafts: 'id',
    });
  }
}

export const localDb = new PosLocalDb();

// Menu items cache
export async function cacheMenuItems(items: MenuItem[], branchId?: string): Promise<void> {
  try {
    const now = Date.now();
    const entries = items.map(item => ({ ...item, _cachedAt: now }));
    if (branchId) {
      await localDb.menuItems.where('branch_id').equals(branchId).delete();
    }
    await localDb.menuItems.bulkPut(entries);
  } catch (e) {
    console.warn('Failed to cache menu items to IndexedDB:', e);
  }
}

export async function getCachedMenuItems(categoryId?: string, branchId?: string): Promise<MenuItem[] | null> {
  try {
    const count = await localDb.menuItems.count();
    if (count === 0) return null;

    let items: (MenuItem & { _cachedAt: number })[];
    if (branchId && categoryId) {
      items = await localDb.menuItems.where('branch_id').equals(branchId).filter(i => i.category_id === categoryId).toArray();
    } else if (branchId) {
      items = await localDb.menuItems.where('branch_id').equals(branchId).toArray();
    } else if (categoryId) {
      items = await localDb.menuItems.where('category_id').equals(categoryId).toArray();
    } else {
      items = await localDb.menuItems.toArray();
    }

    // Check if cache is older than 2 hours
    if (items.length > 0 && Date.now() - items[0]._cachedAt > 2 * 60 * 60 * 1000) {
      return null; // expired
    }
    return items;
  } catch {
    return null;
  }
}

// Categories cache
export async function cacheCategories(cats: Category[], branchId?: string): Promise<void> {
  try {
    const now = Date.now();
    const entries = cats.map(c => ({ ...c, _cachedAt: now }));
    if (branchId) {
      await localDb.categories.where('branch_id').equals(branchId).delete();
    }
    await localDb.categories.bulkPut(entries);
  } catch (e) {
    console.warn('Failed to cache categories to IndexedDB:', e);
  }
}

export async function getCachedCategories(branchId?: string): Promise<Category[] | null> {
  try {
    const count = await localDb.categories.count();
    if (count === 0) return null;

    let cats: (Category & { _cachedAt: number })[];
    if (branchId) {
      cats = await localDb.categories.where('branch_id').equals(branchId).toArray();
    } else {
      cats = await localDb.categories.toArray();
    }

    if (cats.length > 0 && Date.now() - cats[0]._cachedAt > 2 * 60 * 60 * 1000) {
      return null;
    }
    return cats;
  } catch {
    return null;
  }
}

// Cart draft persistence
const CART_DRAFT_ID = 'current_cart';

export async function saveCartDraft(cart: CartItem[], branchId: string): Promise<void> {
  try {
    await localDb.cartDrafts.put({
      id: CART_DRAFT_ID,
      branchId,
      cart,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn('Failed to save cart draft:', e);
  }
}

export async function loadCartDraft(branchId: string): Promise<CartItem[] | null> {
  try {
    const draft = await localDb.cartDrafts.get(CART_DRAFT_ID);
    if (!draft || draft.branchId !== branchId) return null;
    // Expire after 8 hours
    if (Date.now() - draft.updatedAt > 8 * 60 * 60 * 1000) {
      await localDb.cartDrafts.delete(CART_DRAFT_ID);
      return null;
    }
    return draft.cart;
  } catch {
    return null;
  }
}

export async function clearCartDraft(): Promise<void> {
  try {
    await localDb.cartDrafts.delete(CART_DRAFT_ID);
  } catch {}
}
