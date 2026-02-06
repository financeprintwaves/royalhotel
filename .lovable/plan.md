
## Plan: Fix Discount and Split Payment Issues

### Problem Summary

| Issue | Root Cause |
|-------|------------|
| Discount not showing on receipt/orders | Discount is stored in local UI state but never saved to database before payment |
| Split payment errors | Split payment requires `selectedOrderForPayment` which is null for new cart orders |
| Discount not in printed receipt | `recalculateOrderTotals()` ignores discount when updating order totals |

---

### Solution

#### 1. Apply Discount to Database Before Payment (POS.tsx)

**Current flow:**
```
Cart → Create Order → Add Items → recalculateOrderTotals() → Payment
         ↳ discount is in UI state only, never saved
```

**Fixed flow:**
```
Cart → Create Order → Add Items → Apply Discount to Order → Payment
                                    ↳ saves discount_amount to DB
```

**Changes to `handleProcessPayment()` function:**
- After items are added and order is created, call a new function to apply the discount
- Update order with `discount_amount` and recalculated `total_amount`

```typescript
// After addOrderItemsBatch and before payment:
if (discount > 0) {
  await applyDiscount(orderId, discount);
}

// Update paymentTotal to account for discount
const updatedOrder = await getOrder(orderId);
paymentTotal = Number(updatedOrder?.total_amount || 0);
```

The existing `applyDiscount()` function in `orderService.ts` already handles this correctly but is never called from POS.

#### 2. Fix Split Payment for New Orders (POS.tsx)

**Current Issue:** Split payment button handler at line 1368 checks:
```typescript
const orderId = selectedOrderForPayment?.id;
if (!orderId) {
  toast({ variant: 'destructive', title: 'Error', description: 'No order selected' });
  return;
}
```

This fails for new takeaway orders because `selectedOrderForPayment` is null.

**Solution:** For split payments on new cart orders:
1. First create the order and save items (same as single payment)
2. Apply discount to the order
3. Then call `processSplitPayment()` with the new order ID

**Updated split payment logic:**
```typescript
// Inside split payment block:
let orderId = selectedOrderForPayment?.id;

// If no existing order selected, create one from cart
if (!orderId && cart.length > 0) {
  const newOrder = await createOrder(selectedTable?.id || null, customerName || undefined);
  orderId = newOrder.id;
  await addOrderItemsBatch(orderId, batchItems);
  
  // Apply discount
  if (discount > 0) {
    await applyDiscount(orderId, discount);
  }
  
  // Update status to BILL_REQUESTED
  await supabase.rpc('update_order_status', { 
    p_order_id: orderId, 
    p_new_status: 'BILL_REQUESTED' 
  });
}

if (!orderId) {
  toast({ variant: 'destructive', title: 'Error', description: 'No order to pay' });
  return;
}
```

---

### File Changes

| File | Changes |
|------|---------|
| `src/pages/POS.tsx` | 1. Add discount application before payment in `handleProcessPayment()` 2. Fix split payment to create order first if needed 3. Import `applyDiscount` from orderService |

---

### Technical Details

**handleProcessPayment() Changes:**
- After `addOrderItemsBatch()`, check if discount > 0
- If so, call `applyDiscount(orderId, discount)` before payment
- Fetch updated order to get correct `total_amount` with discount applied

**Split Payment Changes:**
- Before checking orderId, create order from cart if `selectedOrderForPayment` is null but cart has items
- Apply same discount logic as single payment
- Use the newly created orderId for split payment

---

### Summary

```
┌──────────────────────────────────────────────────────────────┐
│                    BEFORE (Broken)                           │
├──────────────────────────────────────────────────────────────┤
│ 1. User enters discount in UI                                │
│ 2. Discount shown in cart total                              │
│ 3. Order created → items added → totals calculated           │
│ 4. Payment finalized with wrong total (no discount)          │
│ 5. Receipt uses local discount but DB has 0                  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     AFTER (Fixed)                            │
├──────────────────────────────────────────────────────────────┤
│ 1. User enters discount in UI                                │
│ 2. Discount shown in cart total                              │
│ 3. Order created → items added → discount applied to DB      │
│ 4. Payment finalized with correct total (includes discount)  │
│ 5. Receipt and DB both show correct discount                 │
└──────────────────────────────────────────────────────────────┘
```

