

## Add Payment Transactions Table to Reports/Payments Tab

### What You'll Get
A detailed table below the existing payment charts showing every transaction with columns: Date, Order Number, Cash, Card, Mobile, and Total. It will include filters to narrow down by specific date and payment method.

### Changes

#### 1. New Service Function (`src/services/reportingService.ts`)

Add `getPaymentTransactions()` that queries the `payments` table joined with `orders` to get:
- Date (from payment created_at)
- Order number (from orders.order_number)
- Payment method and amount

Returns an array of objects with order_number, date, cash/card/mobile amounts, and total -- aggregated per order so split payments show amounts in the correct columns.

Add this to `getReportingSummary()` so it's fetched in parallel with other data.

#### 2. Updated Reports Page (`src/pages/Reports.tsx`)

Below the existing two chart cards in the Payments tab, add:

- **Filter row**: A date picker (single date filter) and a payment method dropdown (All / Cash / Card / Mobile) to filter the table
- **Transactions table** with columns: Date, Order #, Cash, Card, Mobile, Total
- **Footer row** with column totals
- Responsive: horizontally scrollable on mobile

The filters are client-side -- they filter the already-fetched payment transactions data (no extra API calls).

### Technical Details

**New interface** in `reportingService.ts`:
```
PaymentTransaction {
  order_id, order_number, date,
  cash_amount, card_amount, mobile_amount, total
}
```

**New function** `getPaymentTransactions(params, branchId)`:
- Queries `payments` joined with `orders` for paid orders in date range
- Groups by order to split cash/card/mobile into separate columns
- Sorted by date descending

**UI filters** use existing components:
- `DateRangePicker` or simple date input for date filter
- `Select` dropdown for payment method filter
- Both filter the transactions array in state

### Files to Edit
| File | Change |
|------|--------|
| `src/services/reportingService.ts` | Add `PaymentTransaction` type + `getPaymentTransactions()` function, add to `getReportingSummary` |
| `src/pages/Reports.tsx` | Add filterable transactions table below payment charts |

