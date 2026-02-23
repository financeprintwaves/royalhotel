

## Auto-Send to Kitchen + Professional Kitchen Display

### What Changes

1. **Auto-send to kitchen**: When items are added in POS (dine-in), automatically send to kitchen without requiring the manual "KITCHEN" button press. The cart submission will create the order and immediately transition it to SENT_TO_KITCHEN in one flow.

2. **Per-item served tracking**: Add an `item_status` column to `order_items` so kitchen staff can mark individual items as "ready" instead of the whole order at once. The order only moves to SERVED when all items are marked ready.

3. **Professional kitchen display**: Redesign the kitchen page with two sections -- Dine-In orders (grouped by table) and Takeaway orders -- with per-item checkboxes showing what is served vs pending.

---

### 1. Database Migration

Add `item_status` column to `order_items` table:

```sql
ALTER TABLE public.order_items
  ADD COLUMN item_status TEXT NOT NULL DEFAULT 'pending';
-- Values: 'pending', 'ready'
```

---

### 2. POS Changes (src/pages/POS.tsx)

**Remove the manual "KITCHEN" button for dine-in.** Replace with a single "CONFIRM ORDER" button that:
- Creates the order
- Batch inserts items
- Calls `sendToKitchen()` automatically
- Clears cart and returns to floor view

The "PAY NOW" button remains for direct payment flows. For takeaway, keep the existing "PAY & COLLECT" flow (which already auto-traverses via `quickPayOrder`).

---

### 3. Kitchen Display Redesign (src/pages/KitchenDisplay.tsx)

Complete rewrite with professional layout:

**Header**: Order count summary (Total | Pending | Ready), live connection indicator

**Two-column layout**:
- **Left section: Dine-In Orders** -- grouped by table number, sorted by order time
- **Right section: Takeaway Orders** -- listed chronologically

**Per-order card**:
- Order number (bold header, e.g., INB2602015)
- Table number or "Takeaway" label
- Time elapsed since order was placed (e.g., "5 min ago")
- Item list with checkboxes: each item shows quantity, name, notes
- Clicking an item toggles its `item_status` between 'pending' and 'ready'
- Color coding: pending items in yellow/orange, ready items in green with strikethrough
- When ALL items are ready, a "Complete Order" button appears (calls `markAsServed`)

**New service function**: `updateOrderItemStatus(itemId, status)` to update individual item status in the database.

---

### 4. Order Service Updates (src/services/orderService.ts)

- Add `updateOrderItemStatus(itemId: string, status: 'pending' | 'ready')` function
- Update `getKitchenOrders()` to also fetch orders with status `SENT_TO_KITCHEN` that have mixed item statuses (already does this)

---

### Files Changed

| File | Changes |
|------|---------|
| Database migration | Add `item_status` column to `order_items` |
| `src/pages/POS.tsx` | Auto-send to kitchen on dine-in order confirm; remove manual KITCHEN button, replace with CONFIRM ORDER |
| `src/pages/KitchenDisplay.tsx` | Full redesign: dine-in vs takeaway sections, per-item served tracking, time elapsed, professional layout |
| `src/services/orderService.ts` | Add `updateOrderItemStatus()` function |
| `src/types/pos.ts` | Add `item_status` to `OrderItem` interface |

