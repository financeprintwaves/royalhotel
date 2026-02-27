

## Fix FOC Confirm Button Not Clickable

### Problem
When you select a table that already has an active order, the existing order's items are loaded separately from the cart. The "CONFIRM FOC" button checks if the cart has items (`cart.length === 0`), but since the existing order's items aren't in the cart, the button stays disabled even after entering a person name.

This affects both new tables (where you haven't added items yet) and tables with existing orders.

### Fix

**File: `src/pages/POS.tsx`**

1. **Update the disabled condition** on the CONFIRM FOC button (desktop and mobile) to also consider existing order items:
   - Change from: `cart.length === 0 || !focDancerName.trim() || loading`
   - Change to: `(cart.length === 0 && !existingOrder?.order_items?.length) || !focDancerName.trim() || loading`

2. **Update `handleFOCConfirm` function** to handle two scenarios:
   - **Existing order on table**: Apply FOC directly to the existing order (update it with FOC fields + quick pay with 0 amount) instead of creating a new order
   - **New order (cart only)**: Keep the current behavior of creating a new order from cart items

This ensures FOC works whether you're applying it to a table's existing order or to a freshly built cart.

### Technical Details

In `handleFOCConfirm`:
- If `existingOrder` exists, use its `id` directly, add any new cart items to it via batch, then mark as FOC and quick-pay
- If no existing order, create a new order from cart (current behavior)
- Update the early return check from `cart.length === 0` to `cart.length === 0 && !existingOrder`

The disabled condition update applies to 3 places:
1. Desktop cart sidebar button (line ~1488)
2. Mobile cart sheet button (line ~1979)
3. The early return guard in `handleFOCConfirm` (line ~492)
