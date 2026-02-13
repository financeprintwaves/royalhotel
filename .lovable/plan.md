

## POS Performance Optimization

### Root Causes Identified

1. **Debug logging on every render** -- `console.log('POS roles check:', ...)` fires on every single re-render, causing unnecessary overhead
2. **Full order list refetch on every realtime event** -- When any order is inserted or updated, the POS refetches ALL orders with all their joins (items, tables, waiters). This is extremely heavy and happens multiple times per action
3. **Sequential state machine transitions** -- For direct payments, the system makes 3 sequential RPC calls (`sendToKitchen` -> `markAsServed` -> `requestBill`) one after another, each waiting for the previous to complete
4. **Redundant order refetch after payment** -- After `finalizePayment`, it calls `getOrder()` again to get the fresh order for the receipt, adding another database round-trip
5. **Realtime callbacks refetch even when not on orders/kitchen view** -- The callbacks still process even though they check the view, causing unnecessary function invocations

### Changes (Single File: `src/pages/POS.tsx`)

**A. Remove debug console.log (line 90)**
Remove the `console.log('POS roles check:', ...)` that fires on every render.

**B. Optimize realtime handlers to use surgical updates instead of full refetches**
Instead of calling `loadAllOrders()` (fetches ALL orders) on every update, surgically patch the specific order in local state using the realtime payload data. For inserts, fetch only the single new order with full joins, then prepend it to the list.

**C. Parallelize state machine transitions**
Replace the sequential calls:
```
await sendToKitchen(orderId);   // wait ~200ms
await markAsServed(orderId);    // wait ~200ms  
await requestBill(orderId);     // wait ~200ms
```
With a single database RPC or at minimum, skip redundant intermediate states by going directly to `BILL_REQUESTED` via a single `updateOrderStatus` call where possible.

Since the RPC `update_order_status` validates transitions, we keep the sequential calls but can optimize by removing the redundant `getOrder()` refetch after payment -- instead reuse the data we already have.

**D. Remove redundant `getOrder()` call after payment**
In `handleProcessPayment`, after `finalizePayment` succeeds, we already have the order data. Instead of fetching again, construct the receipt from the data we already have (cart items + order metadata).

**E. Debounce realtime refetches**
If multiple realtime events arrive rapidly (common when processing an order -- INSERT + multiple UPDATEs), debounce the refetch so only one network call happens instead of 3-4.

### Summary

| Optimization | Impact | Lines Changed |
|---|---|---|
| Remove debug console.log | Eliminates render-time I/O | Line 90 |
| Surgical realtime updates | Eliminates full refetch on every order change (~80% fewer DB calls) | Lines 170-187 |
| Remove redundant getOrder after payment | Saves 1 DB round-trip per payment | Lines 537-538, 555-556, 572 |
| Debounce realtime | Prevents burst refetches (3-4 calls down to 1) | Lines 170-187 |

