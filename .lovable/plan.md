

## Plan: Fix Payment Failure with Discount + Add Discount Report Tab

### Problem 1: Payment Failure After Discount

When paying for a new order (takeaway or dine-in "Pay Now"), the code tries to transition directly from `CREATED` to `BILL_REQUESTED`. The database function only allows:

```
CREATED → SENT_TO_KITCHEN → SERVED → BILL_REQUESTED → PAID
```

The current code (lines 487-494 in POS.tsx) does:
```typescript
await updateOrderStatus(orderId, 'BILL_REQUESTED'); // FAILS!
```

### Problem 2: No Discount Tracking in Reports

The Reports page has tabs for Overview, Sales, Payments, Items, and Summary but no way to see discounts given by date, order, or staff member.

---

### Solution

| Issue | Fix |
|-------|-----|
| Payment failure | Transition through all required states: `CREATED → SENT_TO_KITCHEN → SERVED → BILL_REQUESTED` |
| Missing discount tab | Add new "Discounts" tab with daily totals, order details, and staff breakdown |

---

### File Changes

| File | Changes |
|------|---------|
| `src/pages/POS.tsx` | Fix payment flow to use sequential status transitions for new orders |
| `src/services/reportingService.ts` | Add `getDiscountReport()` function to query orders with discounts |
| `src/pages/Reports.tsx` | Add new "Discounts" tab with date-wise and order-wise discount data |
| `src/components/ExportButtons.tsx` | Add discount data to CSV export |

---

### Technical Details

#### 1. Fix Payment Flow in POS.tsx (lines 487-494)

```typescript
// Before (broken - invalid transition):
if (isTakeaway) {
  await updateOrderStatus(orderId, 'BILL_REQUESTED');
} else {
  await updateOrderStatus(orderId, 'BILL_REQUESTED');
}

// After (fixed - transition through all required states):
// For new orders going directly to payment, we need to traverse 
// the full state machine: CREATED → SENT_TO_KITCHEN → SERVED → BILL_REQUESTED
await sendToKitchen(orderId);     // CREATED → SENT_TO_KITCHEN
await markAsServed(orderId);      // SENT_TO_KITCHEN → SERVED
await requestBill(orderId);       // SERVED → BILL_REQUESTED
```

This follows the same pattern already used for non-kitchen items in `handleSendToKitchen`.

#### 2. New Discount Report Interface (reportingService.ts)

```typescript
export interface DiscountDetail {
  order_id: string;
  order_number: string;
  date: string;
  discount_amount: number;
  original_total: number;
  final_total: number;
  staff_name: string;
  staff_id: string;
}

export interface DailyDiscount {
  date: string;
  total_discount: number;
  order_count: number;
}

export async function getDiscountReport(
  params: DateRangeParams, 
  branchId?: string
): Promise<{
  dailyDiscounts: DailyDiscount[];
  discountDetails: DiscountDetail[];
  totalDiscount: number;
  orderCount: number;
}> {
  // Query orders with discount_amount > 0
  // Join with profiles to get staff name
  // Aggregate by date for daily totals
}
```

#### 3. Add Discounts Tab in Reports.tsx

Add new tab trigger:
```typescript
<TabsTrigger value="discounts">Discounts</TabsTrigger>
```

Tab content will show:
- Summary card with total discount amount and order count
- Daily discount bar chart
- Table with order details: order number, date, discount amount, staff member

#### 4. Update Data Types and Fetching

Update the data state and `getReportingSummary` to include discount data:
```typescript
// Add to data state
discountReport: {
  dailyDiscounts: DailyDiscount[];
  discountDetails: DiscountDetail[];
  totalDiscount: number;
  orderCount: number;
}
```

---

### Order Flow After Fix

```
New Order → Create → Add Items → Apply Discount → Pay Now:

  [CREATED]
      ↓ sendToKitchen() 
  [SENT_TO_KITCHEN] (instant transition)
      ↓ markAsServed()
  [SERVED]
      ↓ requestBill()
  [BILL_REQUESTED]
      ↓ finalizePayment()
  [PAID] ✓
```

All transitions happen in sequence within the same function call, so the user experience is unchanged - they still click "Pay" once and it completes.

---

### Discount Tab UI Preview

```
┌─────────────────────────────────────────────────────────────┐
│ Discounts Tab                                               │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────┐  ┌───────────────┐                       │
│ │ Total         │  │ Orders with   │                       │
│ │ Discount      │  │ Discount      │                       │
│ │ 45.500 OMR    │  │ 23            │                       │
│ └───────────────┘  └───────────────┘                       │
│                                                             │
│ Daily Discount Chart                                        │
│ ▐▌  ▐█▌  ▐▌  ▐█▌  ▐▌  ▐█▌  ▐▌                              │
│ Mon  Tue Wed  Thu  Fri  Sat  Sun                           │
│                                                             │
│ Order Details                                               │
│ ┌────────┬────────┬──────────┬───────────┬────────────────┐│
│ │Order # │ Date   │ Discount │ Final Amt │ Staff          ││
│ ├────────┼────────┼──────────┼───────────┼────────────────┤│
│ │INB001  │ Feb 7  │ 0.500    │ 12.500    │ John Doe       ││
│ │INB002  │ Feb 6  │ 1.000    │ 8.250     │ Jane Smith     ││
│ └────────┴────────┴──────────┴───────────┴────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

### Summary

| Before | After |
|--------|-------|
| Payment fails with "Invalid status transition from CREATED to BILL_REQUESTED" | Payment succeeds by transitioning through all required states |
| No visibility into discounts given | New "Discounts" tab shows daily totals, order details, and staff breakdown |
| Cannot track who gave discounts | Discount report includes staff name for accountability |

