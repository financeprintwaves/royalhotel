

## Fix Cart Buttons, Clear Orders, and Add Dexie Local Database

### 1. Bug Fix: Cart +/- and Delete Buttons Not Working for Portion Items

**Root Cause Found**: In `POS.tsx` lines 1363, 1372, and 1380, the `updateCartQuantity()` and `removeFromCart()` calls do NOT pass `item.selectedPortion`. The matching logic inside these functions checks `!c.selectedPortion` when no portion is passed, so portion-based items never match and the buttons silently do nothing.

**Fix**: Pass `item.selectedPortion` to all three button handlers:
```typescript
// Line 1363 - Minus button
onClick={() => updateCartQuantity(item.menuItem.id, item.isServing, -1, item.selectedPortion)}

// Line 1372 - Plus button  
onClick={() => updateCartQuantity(item.menuItem.id, item.isServing, 1, item.selectedPortion)}

// Line 1380 - Delete button
onClick={() => removeFromCart(item.menuItem.id, item.isServing, item.selectedPortion)}
```

**File**: `src/pages/POS.tsx` (3 line edits)

---

### 2. Clear All Previous Orders

Use the database insert tool to delete all existing order data for a fresh start:
- Delete `order_items` (child rows first)
- Delete `payments` 
- Delete `order_status_log`
- Delete `orders`
- Reset `order_sequences` counters to 0
- Reset all occupied tables back to "available"

This will be done via SQL DELETE statements through the data tool.

---

### 3. Add Dexie (IndexedDB) for Local-First Speed

**Install**: `dexie` package

**New file**: `src/services/localDb.ts`
- Define a Dexie database with tables: `menuItems`, `categories`, `cartDrafts`, `pendingOrders`
- `menuItems` and `categories` are cached locally from the server on first load, then served from IndexedDB on subsequent loads (instant)
- `cartDrafts` stores the current cart state so it survives page refreshes
- `pendingOrders` stores orders that failed to send (offline resilience)

**Update**: `src/hooks/useMenuData.ts`
- On query success, write menu items and categories to Dexie
- On query start, check Dexie first and return cached data as `initialData` to React Query (instant render, then background refresh)

**Update**: `src/pages/POS.tsx`
- Save cart to Dexie on every cart change (auto-persist)
- Restore cart from Dexie on mount (survives refresh)

---

### Files Summary

| Action | File | Purpose |
|--------|------|---------|
| EDIT | `src/pages/POS.tsx` | Fix 3 button handlers + cart persistence |
| NEW | `src/services/localDb.ts` | Dexie IndexedDB database definition |
| EDIT | `src/hooks/useMenuData.ts` | Prefill React Query from Dexie cache |
| DATA | orders/order_items/payments | Clear all previous order data |
| INSTALL | `dexie` | IndexedDB wrapper library |

