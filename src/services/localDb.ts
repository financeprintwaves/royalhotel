import type { Category, MenuItem, CartItem } from '@/types/pos';

// Simple IndexedDB wrapper (no external dependency)
const DB_NAME = 'pos_local_db';
const DB_VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;
      if (oldVersion < 1) {
        const menuStore = db.createObjectStore('menuItems', { keyPath: 'id' });
        menuStore.createIndex('branch_id', 'branch_id');
        menuStore.createIndex('category_id', 'category_id');
        const catStore = db.createObjectStore('categories', { keyPath: 'id' });
        catStore.createIndex('branch_id', 'branch_id');
        db.createObjectStore('cartDrafts', { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
        orderStore.createIndex('branch_id', 'branch_id');
        orderStore.createIndex('order_status', 'order_status');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll<T>(storeName: string, indexName?: string, indexValue?: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    let req: IDBRequest;
    if (indexName && indexValue) {
      req = store.index(indexName).getAll(indexValue);
    } else {
      req = store.getAll();
    }
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function putAll<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearByIndex(storeName: string, indexName: string, indexValue: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const idx = store.index(indexName);
    const req = idx.openCursor(indexValue);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getOne<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function putOne<T>(storeName: string, item: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteOne(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Menu items cache
type CachedMenuItem = MenuItem & { _cachedAt: number };

export async function cacheMenuItems(items: MenuItem[], branchId?: string): Promise<void> {
  try {
    const now = Date.now();
    const entries: CachedMenuItem[] = items.map(item => ({ ...item, _cachedAt: now }));
    if (branchId) await clearByIndex('menuItems', 'branch_id', branchId);
    await putAll('menuItems', entries);
  } catch (e) {
    console.warn('Failed to cache menu items to IndexedDB:', e);
  }
}

export async function getCachedMenuItems(categoryId?: string, branchId?: string): Promise<MenuItem[] | null> {
  try {
    let items: CachedMenuItem[];
    if (branchId) {
      items = await getAll<CachedMenuItem>('menuItems', 'branch_id', branchId);
      if (categoryId) items = items.filter(i => i.category_id === categoryId);
    } else if (categoryId) {
      items = await getAll<CachedMenuItem>('menuItems', 'category_id', categoryId);
    } else {
      items = await getAll<CachedMenuItem>('menuItems');
    }
    if (items.length === 0) return null;
    if (Date.now() - items[0]._cachedAt > 2 * 60 * 60 * 1000) return null;
    return items;
  } catch {
    return null;
  }
}

// Categories cache
type CachedCategory = Category & { _cachedAt: number };

export async function cacheCategories(cats: Category[], branchId?: string): Promise<void> {
  try {
    const now = Date.now();
    const entries: CachedCategory[] = cats.map(c => ({ ...c, _cachedAt: now }));
    if (branchId) await clearByIndex('categories', 'branch_id', branchId);
    await putAll('categories', entries);
  } catch (e) {
    console.warn('Failed to cache categories to IndexedDB:', e);
  }
}

export async function getCachedCategories(branchId?: string): Promise<Category[] | null> {
  try {
    let cats: CachedCategory[];
    if (branchId) {
      cats = await getAll<CachedCategory>('categories', 'branch_id', branchId);
    } else {
      cats = await getAll<CachedCategory>('categories');
    }
    if (cats.length === 0) return null;
    if (Date.now() - cats[0]._cachedAt > 2 * 60 * 60 * 1000) return null;
    return cats;
  } catch {
    return null;
  }
}

// Cart draft persistence
const CART_DRAFT_ID = 'current_cart';

interface CartDraft {
  id: string;
  branchId: string;
  cart: CartItem[];
  updatedAt: number;
}

export async function saveCartDraft(cart: CartItem[], branchId: string): Promise<void> {
  try {
    await putOne<CartDraft>('cartDrafts', { id: CART_DRAFT_ID, branchId, cart, updatedAt: Date.now() });
  } catch (e) {
    console.warn('Failed to save cart draft:', e);
  }
}

export async function loadCartDraft(branchId: string): Promise<CartItem[] | null> {
  try {
    const draft = await getOne<CartDraft>('cartDrafts', CART_DRAFT_ID);
    if (!draft || draft.branchId !== branchId) return null;
    if (Date.now() - draft.updatedAt > 8 * 60 * 60 * 1000) {
      await deleteOne('cartDrafts', CART_DRAFT_ID);
      return null;
    }
    return draft.cart;
  } catch {
    return null;
  }
}

export async function clearCartDraft(): Promise<void> {
  try {
    await deleteOne('cartDrafts', CART_DRAFT_ID);
  } catch {}
}

// ─── Orders cache ──────────────────────────────────────────
type CachedOrder = any & { _cachedAt: number };

const ORDER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function cacheOrders(orders: any[]): Promise<void> {
  try {
    const now = Date.now();
    const entries: CachedOrder[] = orders.map(o => ({ ...o, _cachedAt: now }));
    // Clear all then re-populate
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('orders', 'readwrite');
      tx.objectStore('orders').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await putAll('orders', entries);
  } catch (e) {
    console.warn('Failed to cache orders:', e);
  }
}

export async function getCachedOrders(branchId?: string): Promise<any[] | null> {
  try {
    let items: CachedOrder[];
    if (branchId) {
      items = await getAll<CachedOrder>('orders', 'branch_id', branchId);
    } else {
      items = await getAll<CachedOrder>('orders');
    }
    if (items.length === 0) return null;
    if (Date.now() - items[0]._cachedAt > ORDER_CACHE_TTL) return null;
    return items;
  } catch {
    return null;
  }
}
