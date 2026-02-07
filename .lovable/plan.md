

## Plan: Add Error Handling for update_order_status RPC

### Problem

The `update_order_status` RPC returns a response with `{ success: boolean, error?: string }` but the code in POS.tsx:
1. Calls the RPC directly without checking the `success` field
2. Does not display an error toast when the status transition fails
3. Continues with payment even if the status update failed

This causes silent failures when order status transitions are invalid (e.g., CREATED → BILL_REQUESTED is not allowed by the workflow).

---

### Solution

Update the `updateOrderStatus` function in orderService.ts to check the `success` field and throw an error if it fails. Then update POS.tsx to use this service function instead of calling the RPC directly.

---

### File Changes

| File | Changes |
|------|---------|
| `src/services/orderService.ts` | Update `updateOrderStatus()` to check response success field and throw descriptive error |
| `src/pages/POS.tsx` | Replace direct `supabase.rpc('update_order_status', ...)` calls with imported `updateOrderStatus()` function that has proper error handling |

---

### Technical Details

#### 1. Update orderService.ts - updateOrderStatus function

```typescript
// Current (no success check):
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<UpdateOrderStatusResponse> {
  const { data, error } = await supabase.rpc('update_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
  });

  if (error) throw error;
  return data as unknown as UpdateOrderStatusResponse;
}

// Fixed (with success check):
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<UpdateOrderStatusResponse> {
  const { data, error } = await supabase.rpc('update_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
  });

  if (error) throw error;
  
  const response = data as unknown as UpdateOrderStatusResponse;
  if (!response.success) {
    throw new Error(response.error || 'Failed to update order status');
  }
  
  return response;
}
```

#### 2. Update POS.tsx - Replace direct RPC calls

**Import updateOrderStatus:**
```typescript
import { 
  createOrder, addOrderItemsBatch, sendToKitchen, getOrder, getOrders, getKitchenOrders, 
  markAsServed, requestBill, applyDiscount, cancelOrder, updateOrderStatus
} from '@/services/orderService';
```

**Replace direct RPC calls (4 locations):**

Line 468-471:
```typescript
// Before
await supabase.rpc('update_order_status', {
  p_order_id: orderId,
  p_new_status: 'BILL_REQUESTED'
});

// After
await updateOrderStatus(orderId, 'BILL_REQUESTED');
```

Line 491:
```typescript
// Before
await supabase.rpc('update_order_status', { p_order_id: orderId, p_new_status: 'BILL_REQUESTED' });

// After
await updateOrderStatus(orderId, 'BILL_REQUESTED');
```

Line 494:
```typescript
// Before
await supabase.rpc('update_order_status', { p_order_id: orderId, p_new_status: 'BILL_REQUESTED' });

// After
await updateOrderStatus(orderId, 'BILL_REQUESTED');
```

Line 1427-1430:
```typescript
// Before
await supabase.rpc('update_order_status', { 
  p_order_id: orderId, 
  p_new_status: 'BILL_REQUESTED' 
});

// After
await updateOrderStatus(orderId, 'BILL_REQUESTED');
```

The existing try-catch blocks in POS.tsx will now catch these errors and display the error toast automatically (the catch blocks already call `toast({ variant: 'destructive', ... })`).

---

### Summary

| Before | After |
|--------|-------|
| Direct RPC calls without checking `success` | Service function checks `success` and throws error |
| Silent failures when status transition invalid | Error toast displayed with specific error message |
| Payment continues after failed status update | Payment blocked, user informed of issue |

