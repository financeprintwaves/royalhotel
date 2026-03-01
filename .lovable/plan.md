

## Add Print Button to Every Order + Local Order Cache for Speed

### What You'll Get
- A **Print** button on every order card (active and completed) across both POS and Orders pages
- Clicking Print will instantly attempt silent printing (QZ Tray or daemon) -- no dialog, no delay
- All orders cached locally in IndexedDB so viewing and printing is instant even on slow connections
- Receipt dialog opens faster by using locally cached order data instead of fetching from the server

### Changes

#### 1. Add direct Print button to order cards (POS.tsx)

**Active orders** (lines ~1179-1183): Add a Print button next to the existing View button that triggers silent print directly without opening the receipt dialog.

**Completed orders** (lines ~1255-1261): The Print button already exists but currently just opens the receipt dialog (same as View). Change it to trigger instant silent print instead.

#### 2. Add direct Print button to order cards (Orders.tsx)

**Active orders** (lines ~331-360): Add a Printer icon button on every order card (not just BILL_REQUESTED status) that triggers instant silent printing.

**Completed orders** (lines ~370-408): Already has a Receipt button -- add a separate Print button that fires silent print directly.

#### 3. Create instant print function

Add a `handleQuickPrint(order)` function in both POS.tsx and Orders.tsx that:
- Renders the Receipt component off-screen using the order data already in memory
- Calls `silentPrintHTML(html)` directly -- no dialog, no loading spinner
- Falls back to opening the receipt dialog only if silent print is unavailable
- Shows a brief toast on success ("Receipt printed") or failure ("Open receipt to print manually")

#### 4. Cache orders locally in IndexedDB (localDb.ts)

Add order caching to the existing IndexedDB wrapper:
- New object store: `orders` (keyPath: `id`, indexes: `branch_id`, `order_status`)
- `cacheOrders(orders)` -- saves fetched orders locally
- `getCachedOrders()` -- returns cached orders instantly on page load
- Cache expires after 30 minutes (orders change frequently)

#### 5. Use cached orders for instant loading (POS.tsx + Orders.tsx)

- On mount, immediately load orders from IndexedDB cache (instant, no network)
- Then fetch fresh orders from the server in the background
- When server data arrives, update both the UI and the cache
- Result: orders appear instantly on screen, then silently refresh

#### 6. Pre-render receipt HTML for speed

Add a utility function `renderReceiptHTML(order, branchInfo)` that generates receipt HTML from order data without needing a mounted React component. This allows the quick-print button to generate and send HTML to the printer in under 50ms.

### Technical Details

**New IndexedDB store in localDb.ts:**
```typescript
// DB_VERSION bumped to 2
// New store: 'orders' with indexes on branch_id and order_status
// Cache TTL: 30 minutes

export async function cacheOrders(orders: Order[]): Promise<void>
export async function getCachedOrders(branchId?: string): Promise<Order[] | null>
```

**Quick print function pattern (used in both pages):**
```typescript
async function handleQuickPrint(order: Order) {
  const html = renderReceiptHTML(order, branchInfo);
  const sent = await silentPrintHTML(html);
  if (sent) {
    toast({ title: 'Receipt printed' });
  } else {
    // Fall back to receipt dialog
    setReceiptOrder(order);
    setShowReceiptDialog(true);
  }
}
```

**Order card button layout (all statuses):**
```
[View] [Print] [Kitchen/Served/Bill/Pay] [Cancel]
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/services/localDb.ts` | Add orders cache store (bump DB version to 2) |
| `src/utils/receiptRenderer.ts` | Create -- generates receipt HTML string from order data |
| `src/pages/POS.tsx` | Add quick-print button to all order cards, load from cache first |
| `src/pages/Orders.tsx` | Add quick-print button to all order cards, load from cache first |

