

## Add Pre-Payment Invoice Preview to Payment Dialog

### What Changes

The payment dialog will show a complete bill summary at the top -- listing all items, quantities, prices, subtotal, discount, and total -- before the payment method selection. This gives staff a clear invoice preview before confirming payment, for both table orders and takeaway.

### Implementation

**File: `src/pages/POS.tsx`** (single file change)

Insert a bill summary section inside the payment dialog, right after the `DialogHeader` and before the payment method toggle. The summary will:

1. Show order items with quantity, name, and line total (from cart for new orders, or from `selectedOrderForPayment.order_items` for existing orders)
2. Show subtotal, discount (if any), and grand total
3. Show table number or "Takeaway" label
4. Use a compact, receipt-like layout with a `ScrollArea` (max height ~200px) so it doesn't overflow on long orders
5. Use a `Separator` to visually divide the invoice preview from the payment controls

### Technical Details

- For new orders (from cart): iterate over `cart` array and `existingOrder?.order_items` to build the item list
- For existing orders (from Orders view): use `selectedOrderForPayment.order_items`
- All data is already in local state -- zero network calls needed
- The dialog width stays at `max-w-md` but gains a scrollable item list
- Currency formatted as OMR with 3 decimal places using existing `formatOMR` or inline `.toFixed(3)`

