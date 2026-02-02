

## Plan: Optimize Payment Speed + Add Portion Sizes (Small/Medium/Large)

### Summary
This plan addresses two requirements:
1. **Faster Payment Processing** - Optimize the payment flow to reduce delays
2. **Portion Size Options** - Add Small/Medium/Large pricing to menu items (in addition to existing bottle/shot)

---

### Part 1: Payment Speed Optimization

**Current Issues Identified:**

| Issue | Location | Impact |
|-------|----------|--------|
| Multiple sequential `update_order_status` RPC calls | POS.tsx lines 466-474 | 3 separate calls for takeaway |
| `getOrder` refetch after payment | POS.tsx line 486, 559 | Extra database round-trip |
| Receipt dialog delay after success overlay | POS.tsx lines 1388-1394 | Sequential UI flow |

**Root Cause Analysis:**
```
Current Takeaway Flow (SLOW):
1. createOrder → 1 RPC
2. addOrderItemsBatch → 1 RPC
3. update_order_status('SENT_TO_KITCHEN') → 1 RPC
4. update_order_status('SERVED') → 1 RPC
5. update_order_status('BILL_REQUESTED') → 1 RPC
6. finalizePayment → 1 RPC
7. getOrder (refetch for receipt) → 1 RPC
Total: 7 sequential RPCs = SLOW!
```

**Optimized Flow (FAST):**
```
1. createOrder with items in single RPC → 1 call
2. finalizePayment (status update embedded) → 1 call
3. Use payment response data for receipt (no refetch)
Total: 2 RPCs = FAST!
```

**Changes:**

1. **Remove redundant status transitions for takeaway:**
   - Payment RPC already sets status to PAID
   - Skip SENT_TO_KITCHEN → SERVED → BILL_REQUESTED for takeaway (not needed)

2. **Optimize `handleProcessPayment`:**
   - For takeaway: Create order → Add items → Pay immediately
   - Skip intermediate status updates
   - Use optimistic UI updates

3. **Remove redundant `getOrder` call after payment:**
   - Use the cart data we already have for receipt
   - Only refetch if absolutely necessary

**Code Changes (POS.tsx):**
```typescript
// BEFORE (lines 463-478): Multiple status transitions
if (isTakeaway) {
  await supabase.rpc('update_order_status', { p_order_id: orderId, p_new_status: 'SENT_TO_KITCHEN' });
  await supabase.rpc('update_order_status', { p_order_id: orderId, p_new_status: 'SERVED' });
  await supabase.rpc('update_order_status', { p_order_id: orderId, p_new_status: 'BILL_REQUESTED' });
} else {
  await sendToKitchen(orderId);
  await supabase.rpc('update_order_status', { p_order_id: orderId, p_new_status: 'SERVED' });
  await supabase.rpc('update_order_status', { p_order_id: orderId, p_new_status: 'BILL_REQUESTED' });
}

// AFTER: Skip to payment directly (already creates order with CREATED status, finalize_payment updates to PAID)
// For takeaway: Don't need intermediate statuses, pay directly
// For dine-in pay now: Same optimization
```

---

### Part 2: Portion Size Options (Small/Medium/Large)

**Current State:**
- The system has bottle/shot pricing via `serving_price` and `serving_size_ml`
- RHBR branch uses this for spirits
- Other branches need Small/Medium/Large portions for food/drinks

**Proposed Solution:**
Add JSONB column for flexible portion options that works for all branch types.

**Database Change:**
```sql
ALTER TABLE public.menu_items 
ADD COLUMN portion_options JSONB DEFAULT NULL;

-- Example data structure:
-- [
--   { "name": "Small", "price": 0.500, "size_ml": 150 },
--   { "name": "Medium", "price": 0.750, "size_ml": 250 },
--   { "name": "Large", "price": 1.000, "size_ml": 350 }
-- ]
```

**Why JSONB?**
- Flexible: Works for any number of portions
- Backwards compatible: Existing items continue working
- Branch-agnostic: Each branch can define their own portion names/sizes

**Updated Type Definition (pos.ts):**
```typescript
export interface PortionOption {
  name: string;      // "Small", "Medium", "Large", "Regular", "Shot", etc.
  price: number;     // Price for this portion
  size_ml?: number;  // Optional size in ml
}

export interface MenuItem {
  // ... existing fields
  portion_options: PortionOption[] | null;
}
```

**Updated Billing Logic:**
```
When billing_type = 'by_serving':
  - If portion_options is set → Show portion picker with custom options
  - Else use existing serving_price for shot/bottle
```

**UI Changes:**

1. **Menu Management - Add Portion Options:**
   - New section in item form: "Portion Pricing"
   - Add/remove portion options dynamically
   - Each portion has: Name, Price, Size (optional)

2. **Serving Selection Dialog - Support Portions:**
   - If item has `portion_options` → Show as clickable buttons
   - If item has `serving_price` only → Show existing Bottle/Shot picker
   - Makes the dialog generic for both scenarios

---

### File Changes Summary

| File | Action | Changes |
|------|--------|---------|
| supabase/migrations/new | Create | Add `portion_options` JSONB column |
| src/types/pos.ts | Modify | Add `PortionOption` interface, update `MenuItem` |
| src/pages/POS.tsx | Modify | Optimize payment flow, use portion options |
| src/pages/MenuManagement.tsx | Modify | Add portion options UI in item form |
| src/components/ServingSelectionDialog.tsx | Rename/Modify | Rename to PortionSelectionDialog, support dynamic portions |
| src/services/menuService.ts | Modify | Handle portion_options in create/update |

---

### Database Migration

```sql
-- Add portion options for flexible size/price combinations
ALTER TABLE public.menu_items 
ADD COLUMN portion_options JSONB DEFAULT NULL;

COMMENT ON COLUMN public.menu_items.portion_options IS 
  'JSON array of portion options: [{name, price, size_ml}]';
```

---

### UI Flow for Portion Selection

**Before (only for spirits):**
```
Click item → Bottle/Shot dialog → Add to cart
```

**After (works for all items with portions):**
```
Click item → Portion options popup → Add selected portion to cart
```

**Portion Options Dialog:**
```
┌──────────────────────────────────────┐
│        Chicken Biryani               │
│  Select your portion size:           │
├──────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │ Small   │ │ Medium  │ │ Large   │ │
│  │ 1.500   │ │ 2.000   │ │ 2.500   │ │
│  │   OMR   │ │   OMR   │ │   OMR   │ │
│  └─────────┘ └─────────┘ └─────────┘ │
└──────────────────────────────────────┘
```

---

### Technical Implementation Order

| Priority | Task | Impact |
|----------|------|--------|
| 1 | Payment optimization | Immediate speed improvement |
| 2 | Database migration | Add column |
| 3 | Type updates | TypeScript support |
| 4 | Menu Management UI | Admin can set portions |
| 5 | POS portion selection | Staff can use portions |

---

### Summary

| Requirement | Solution |
|-------------|----------|
| Slow payment | Remove redundant RPC calls, skip intermediate statuses |
| Portion sizes | Add `portion_options` JSONB column, generic portion picker |

