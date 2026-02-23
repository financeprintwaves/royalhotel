

## Remove Transaction References and Fix Amount Issues

### Changes Overview

Make card and mobile payments work with a single tap (same as cash) by removing all transaction reference inputs and validation. Also fix the amount mismatch issue where the payment total can be less than the actual bill.

### 1. Remove Transaction Reference for Single Payments

**File: `src/pages/POS.tsx`**

- Remove the transaction reference `Input` field shown when payment method is card or mobile (lines 1554-1560)
- Remove the `disabled` condition that blocks confirm when `transactionRef` is empty for non-cash (line 1736)
- Stop passing `transactionRef` to `quickPayOrder` -- pass `undefined` for all methods (lines 568, 690)

### 2. Remove Transaction References for Split Payments

**File: `src/pages/POS.tsx`**

- Remove the card transaction reference `Input` in split mode (lines 1592-1598)
- Remove the mobile transaction reference `Input` in split mode (lines 1613-1618)
- Remove the split payment validation that blocks confirm when references are empty (lines 1656-1664)
- Stop passing references in the split payment RPC calls

### 3. Fix Amount Mismatch

**File: `src/pages/POS.tsx`**

The "amount lesser than bill" bug occurs when an existing order already has a discount baked into `total_amount`, but the local `grandTotal` formula subtracts the discount again:

```
total = subtotal - discount
grandTotal = existingTotal + total  (existingTotal already has discount applied)
```

When `existingOrder` is present and new cart items are added with a discount, the discount is subtracted twice. Fix: when an existing order is present and new cart items are being added, use `existingTotal + subtotal` (not `existingTotal + total`) since the existing order's total already accounts for its own discount. Only subtract the new discount if one is being applied fresh.

Also ensure that `handleProcessPayment` line 547 (`paymentTotal = existingTotal + total`) is consistent with `grandTotal` to avoid the displayed total differing from the charged total.

### Files Changed

| File | Changes |
|------|---------|
| `src/pages/POS.tsx` | Remove all transaction reference inputs, validation, and passing; fix amount calculation for existing orders |

