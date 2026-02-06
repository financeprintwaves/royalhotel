

## Plan: Fix Discount, Add Order View/Print, Admin Edit & Cancel, Remove Animation

### Issues Identified

| Issue | Root Cause |
|-------|------------|
| Discount not showing properly | handleProcessOrderPayment uses old order data, doesn't fetch updated order with discount |
| POS Orders view has no "View Order" or "Print" button | Only payment action is present, missing receipt preview/print |
| Admin cannot edit or cancel orders | No edit/cancel functionality exists for active or completed orders |
| Payment animation delays printing | PaymentSuccessOverlay waits 2.5 seconds before showing receipt |

---

### Solution Overview

#### 1. Fix Discount Display in Payment Flow (POS.tsx)

**Current Issue:** `handleProcessOrderPayment()` uses `selectedOrderForPayment` which may have stale `discount_amount`. Need to fetch fresh order data after discount is applied.

**Fix:** 
- After successful payment, fetch the updated order with discount from database before showing receipt
- Use `getOrder(orderId)` to get accurate data with discount

#### 2. Add View Order & Print to POS Orders View (POS.tsx)

**Current state:** Orders view only shows status action buttons (Kitchen, Served, Bill, Pay)

**Add:**
- "View" button on each order card to open ReceiptDialog with order details
- "Print" button on completed orders for reprinting receipts

#### 3. Add Admin Edit Invoice & Cancel Order (POS.tsx + orderService.ts)

**Admin capabilities:**
- **Edit Invoice button:** Opens order in edit mode to modify items/discount (for active orders)
- **Cancel Order button:** Cancels order and resets table status to available

**Implementation:**
- Add `cancelOrder()` function in orderService.ts
- Add Edit/Cancel buttons visible only to admins
- Edit button loads order into cart for modification

#### 4. Remove Payment Success Animation (POS.tsx)

**Current:** PaymentSuccessOverlay shows for 2.5 seconds before triggering print

**Fix:**
- Skip the animation overlay entirely
- Go directly to ReceiptDialog with autoPrint=true after payment success

---

### File Changes

| File | Changes |
|------|---------|
| `src/pages/POS.tsx` | 1. Fix discount by fetching updated order 2. Add View/Print buttons to Orders view 3. Add Admin Edit/Cancel buttons 4. Remove PaymentSuccessOverlay usage - go directly to print |
| `src/services/orderService.ts` | Add `cancelOrder()` function to update status to CLOSED and reset table |

---

### Technical Details

#### 1. Fix handleProcessOrderPayment discount issue (POS.tsx)

Change:
```typescript
// Current: Uses stale selectedOrderForPayment
setAutoPrintOrder({
  ...selectedOrderForPayment,
  order_status: 'PAID',
});

// Fixed: Fetch fresh order after payment
const freshOrder = await getOrder(selectedOrderForPayment.id);
setAutoPrintOrder(freshOrder);
```

#### 2. Add View/Print to Orders View cards (POS.tsx)

In the Orders view section (lines 840-900), add buttons:
```typescript
{/* View button for all orders */}
<Button size="sm" variant="outline" onClick={() => {
  setReceiptOrder(order);
  setShowReceiptDialog(true);
}}>
  <Receipt className="h-3 w-3 mr-1" />View
</Button>
```

Also add to completed orders section (lines 905-935).

#### 3. Add Admin Edit & Cancel buttons (POS.tsx)

For admin users only:
```typescript
{isAdmin() && (
  <>
    <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)}>
      <Edit className="h-3 w-3 mr-1" />Edit
    </Button>
    <Button size="sm" variant="destructive" onClick={() => handleCancelOrder(order.id)}>
      <X className="h-3 w-3 mr-1" />Cancel
    </Button>
  </>
)}
```

Add handler functions:
```typescript
function handleEditOrder(order: Order) {
  setSelectedOrderForPayment(null);
  setExistingOrder(order);
  setCart([]);
  setSelectedTable((order as any).table || null);
  setCustomerName((order as any).customer_name || '');
  setDiscount(Number(order.discount_amount) || 0);
  setView('menu');
}

async function handleCancelOrder(orderId: string) {
  if (!confirm('Cancel this order?')) return;
  await cancelOrder(orderId);
  toast({ title: 'Order Cancelled' });
  loadAllOrders();
}
```

#### 4. Add cancelOrder function (orderService.ts)

```typescript
export async function cancelOrder(orderId: string): Promise<void> {
  // Get order with table info
  const { data: order } = await supabase
    .from('orders')
    .select('table_id')
    .eq('id', orderId)
    .single();
  
  // Update order status to CLOSED
  await supabase
    .from('orders')
    .update({ 
      order_status: 'CLOSED',
      payment_status: 'cancelled'
    })
    .eq('id', orderId);
  
  // Reset table if order had one
  if (order?.table_id) {
    await supabase
      .from('restaurant_tables')
      .update({ status: 'available' })
      .eq('id', order.table_id);
  }
}
```

#### 5. Remove Animation - Go Direct to Print (POS.tsx)

In `handleProcessPayment` and `handleProcessOrderPayment`:

Change:
```typescript
// Current: Shows animation first
setPaymentSuccessAmount(paymentTotal);
setShowPaymentSuccess(true);
setAutoPrintOrder(receiptOrderData);

// Fixed: Skip animation, go direct to print
setReceiptOrder(receiptOrderData);
setShowReceiptDialog(true);
toast({ title: 'Payment Successful!' });
```

Also remove or comment out PaymentSuccessOverlay component usage.

---

### Import Changes

Add to POS.tsx imports:
```typescript
import { Edit, X } from 'lucide-react';
import { cancelOrder } from '@/services/orderService';
```

---

### Summary

| Before | After |
|--------|-------|
| Discount may show 0 on receipt | Fresh order data fetched with correct discount |
| No View/Print in POS Orders | View/Print buttons on all order cards |
| Admin cannot edit paid/active orders | Admin can edit and cancel any order |
| 2.5s animation delay before print | Immediate receipt print on payment success |

