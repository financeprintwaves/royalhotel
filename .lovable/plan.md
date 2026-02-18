

## Instant Billing: Single-RPC Payment

### The Problem

When you click "Pay Now", the system makes **4 sequential network calls** to the database:
1. sendToKitchen (~200ms)
2. markAsServed (~200ms)
3. requestBill (~200ms)
4. finalizePayment (~200ms)

Total: **~800ms+ of waiting** before the bill appears.

### The Solution

Replace all 4 calls with a **single database function** (`quick_pay_order`) that does everything in one call (~200ms total). The bill will appear in under 1 second.

### Changes

#### 1. Create database function `quick_pay_order`

A single SQL function that atomically:
- Transitions the order through all required states (CREATED -> SENT_TO_KITCHEN -> SERVED -> BILL_REQUESTED -> PAID)
- Records the payment
- Deducts inventory
- Returns success

This runs entirely inside the database -- one network round-trip instead of four.

#### 2. Add `quickPayOrder` to `src/services/orderService.ts`

A new function that calls the `quick_pay_order` RPC.

#### 3. Update `src/pages/POS.tsx` payment flow

Replace the 4 sequential calls:
```
await sendToKitchen(orderId);
await markAsServed(orderId);
await requestBill(orderId);
await finalizePayment(orderId, total, method, ref);
```

With one call:
```
await quickPayOrder(orderId, total, method, ref);
```

The receipt is already built from local state (no extra DB call), so after this single RPC returns, the bill shows immediately.

### Result

| Before | After |
|--------|-------|
| 4 network calls (~800ms+) | 1 network call (~200ms) |
| Bill appears in 1-2 seconds | Bill appears in under 1 second |

### Files Changed

| File | Action |
|------|--------|
| Database migration | New `quick_pay_order` function |
| `src/services/orderService.ts` | Add `quickPayOrder` wrapper |
| `src/pages/POS.tsx` | Replace 4 calls with 1 call |

