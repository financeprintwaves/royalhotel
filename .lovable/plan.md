

## Plan: Fix Print KOT, Print Bill & Payment Buttons

### Issues Found
1. **Print KOT & Print Bill buttons** are in the right Action Panel's function grid — user wants them in the cart area (left panel), below the Hold Order button
2. **Print KOT doesn't create an order** — `KOTPrintDialog.handlePrint` just logs to console; it needs to call `handleAddItemToOrder()` first, then `printKOTMutation`
3. **Payment button does nothing** — the `PaymentDialog` calls `processPaymentMutation` which requires `currentOrder.id`, but no order is created before opening the dialog
4. **Print Bill does nothing** — same issue, no order exists

### Solution (3 files)

| File | Change |
|------|--------|
| `src/components/pos/POSLayout.tsx` | Move Print KOT and Print Bill buttons to the cart panel (below Hold Order, above Payment). Wire them to create order first, then print. |
| `src/components/pos/POSActionPanel.tsx` | Remove Print KOT and Print Bill from the function grid (they're now in cart panel). Remove duplicate PaymentDialog. |
| `src/components/pos/KOTPrintDialog.tsx` | Wire the Print button to actually create the order and call `printKOTMutation` from `usePOSWorkflow` |

### Button Order in Cart Panel (Desktop)
```text
[ Hold Order ] [ Recall ]
[ Print KOT          ]   ← creates order + prints KOT
[ Print Bill         ]   ← creates order + prints bill
[ ══ Payment ══      ]   ← creates order + opens payment dialog
```

### Key Logic Fix
Before printing KOT, printing bill, or opening payment — always ensure an order exists by calling `handleAddItemToOrder()` from `usePOSWorkflow`. This creates the order in the database if `currentOrder` is null, then adds cart items.

