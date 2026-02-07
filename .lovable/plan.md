

## Plan: Fix Non-Kitchen Items Status Transition

### Problem Analysis

When an order contains only non-kitchen items (drinks, bar items):
1. `createOrder()` creates order with status `CREATED`
2. `markAsServed(orderId)` is called to skip kitchen and go directly to `SERVED`
3. **BUT** the database RPC `update_order_status` only allows:
   - `CREATED → SENT_TO_KITCHEN` (the only valid transition from CREATED)
   - `SENT_TO_KITCHEN → SERVED`
4. The transition `CREATED → SERVED` is blocked by the RPC validation
5. Order stays in `CREATED` status, showing "Send to Kitchen" button on Orders page

### Root Cause

| Location | Issue |
|----------|-------|
| `POS.tsx` line 379, 400 | Calls `markAsServed()` directly on `CREATED` order |
| `update_order_status` RPC | Strict validation blocks `CREATED → SERVED` |
| Result | Order stays at `CREATED`, shows wrong buttons in UI |

---

### Solution

Update `POS.tsx` to transition through proper states for non-kitchen items:

```
CREATED → SENT_TO_KITCHEN → SERVED
```

Instead of a single call, make two sequential calls:

```typescript
// Before (broken):
await markAsServed(orderId);

// After (fixed):
await sendToKitchen(orderId);  // CREATED → SENT_TO_KITCHEN
await markAsServed(orderId);   // SENT_TO_KITCHEN → SERVED
```

This follows the valid state machine while still achieving the goal of skipping kitchen display for non-kitchen items.

---

### File Changes

| File | Changes |
|------|---------|
| `src/pages/POS.tsx` | Update `handleSendToKitchen()` to make two sequential status transitions for non-kitchen orders |

---

### Technical Details

#### Update handleSendToKitchen() in POS.tsx

**Lines 377-384 (existing order with non-kitchen items):**
```typescript
// Current (broken):
} else {
  // No kitchen items - mark as served directly
  await markAsServed(orderId);
  toast({ ... });
}

// Fixed:
} else {
  // No kitchen items - transition through states to skip kitchen display
  await sendToKitchen(orderId);   // CREATED → SENT_TO_KITCHEN
  await markAsServed(orderId);    // SENT_TO_KITCHEN → SERVED
  toast({ ... });
}
```

**Lines 398-405 (new order with non-kitchen items):**
```typescript
// Current (broken):
} else {
  // No kitchen items - skip kitchen, go to SERVED
  await markAsServed(orderId);
  toast({ ... });
}

// Fixed:
} else {
  // No kitchen items - transition through states to skip kitchen display
  await sendToKitchen(orderId);   // CREATED → SENT_TO_KITCHEN  
  await markAsServed(orderId);    // SENT_TO_KITCHEN → SERVED
  toast({ ... });
}
```

---

### Order Flow After Fix

```text
Non-Kitchen Order Created:
  [CREATED]
      ↓ sendToKitchen()
  [SENT_TO_KITCHEN] (instant, no kitchen display)
      ↓ markAsServed()  
  [SERVED] ← Ready for bill
      ↓
  Orders page shows "Bill" button correctly
```

The transition happens so fast that the order never appears on the Kitchen Display - it goes immediately to SERVED status.

---

### Summary

| Before | After |
|--------|-------|
| `markAsServed()` fails silently on `CREATED` orders | Two-step transition: `sendToKitchen()` then `markAsServed()` |
| Non-kitchen orders stuck at `CREATED` | Non-kitchen orders correctly at `SERVED` |
| Orders page shows "Send to Kitchen" incorrectly | Orders page shows "Bill" button correctly |

