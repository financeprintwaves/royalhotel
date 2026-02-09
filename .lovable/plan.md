

## Plan: FOC (Free of Cost) for Dancers

### Overview

Add the ability to mark an entire order as FOC (Free of Cost) for dancers. When FOC is selected, the order total becomes zero, a dancer name is recorded, and it appears in a dedicated FOC tab in Reports.

### What Changes

| Area | Change |
|------|--------|
| Database | Add `is_foc` (boolean) and `foc_dancer_name` (text) columns to `orders` table |
| POS Cart | Add a "FOC" toggle button + dancer name input in the order sidebar |
| Payment Flow | When FOC is on, skip payment entirely -- just close the order at zero cost |
| Reports | Add "FOC" tab showing date-wise and item-wise FOC data with dancer names |
| Discount Report | FOC orders excluded from discount tab (they are separate) |

---

### Database Migration

```sql
ALTER TABLE orders ADD COLUMN is_foc BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN foc_dancer_name TEXT;
```

No new RLS policies needed -- existing order policies cover these columns.

---

### POS Changes (src/pages/POS.tsx)

**New state variables:**
- `isFOC` (boolean) -- toggle for FOC mode
- `focDancerName` (string) -- dancer name input

**Cart sidebar addition** (below discount section):

```
┌──────────────────────────────────┐
│ ☑ FOC (Free of Cost)            │
│ Dancer Name: [_______________]  │
└──────────────────────────────────┘
```

When FOC is toggled ON:
- Discount input is hidden (not needed)
- Grand total shows 0.000 OMR
- "PAY NOW" button changes to "CONFIRM FOC"

**FOC processing flow:**
1. Create order with items (same as now)
2. Set `is_foc = true`, `foc_dancer_name`, `total_amount = 0`, `discount_amount = subtotal`
3. Transition through states: CREATED -> SENT_TO_KITCHEN -> SERVED -> BILL_REQUESTED
4. Finalize payment at 0.000 OMR with method 'cash'
5. Show receipt with "FOC - Dancer: [Name]"

---

### Reporting Changes

**New service function** in `src/services/reportingService.ts`:

```typescript
export interface FOCDetail {
  order_id: string;
  order_number: string;
  date: string;
  dancer_name: string;
  items: string[];        // item names from order_items
  total_value: number;    // original value of items
  staff_name: string;     // who created the FOC order
}

export async function getFOCReport(params, branchId?): Promise<{
  focDetails: FOCDetail[];
  totalFOCValue: number;
  focCount: number;
  dancerSummary: { dancer: string; count: number; value: number }[];
}>
```

**New "FOC" tab in Reports.tsx:**

```
┌─────────────────────────────────────────────────────────────┐
│ FOC Tab                                                     │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐ │
│ │ Total FOC     │  │ FOC Orders    │  │ Dancers          │ │
│ │ Value         │  │ Count         │  │ Count            │ │
│ │ 45.500 OMR    │  │ 23            │  │ 5                │ │
│ └───────────────┘  └───────────────┘  └──────────────────┘ │
│                                                             │
│ By Dancer                                                   │
│ ┌──────────┬────────┬──────────────────────────────────────┐│
│ │ Dancer   │ Count  │ Total Value                         ││
│ ├──────────┼────────┼──────────────────────────────────────┤│
│ │ Maria    │ 8      │ 15.500 OMR                          ││
│ │ Sofia    │ 5      │ 12.000 OMR                          ││
│ └──────────┴────────┴──────────────────────────────────────┘│
│                                                             │
│ Order Details                                               │
│ ┌────────┬────────┬──────────┬──────────┬─────────────────┐│
│ │Order # │ Date   │ Dancer   │ Items    │ Value   │ Staff ││
│ ├────────┼────────┼──────────┼──────────┼─────────────────┤│
│ │INB001  │ Feb 9  │ Maria    │ Beer x2  │ 4.000   │ John  ││
│ └────────┴────────┴──────────┴──────────┴─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

### File Changes

| File | Changes |
|------|---------|
| **Database** | Add `is_foc` and `foc_dancer_name` columns to orders |
| `src/pages/POS.tsx` | Add FOC toggle, dancer name input, FOC payment flow |
| `src/services/reportingService.ts` | Add `getFOCReport()`, include in `getReportingSummary()` |
| `src/pages/Reports.tsx` | Add "FOC" tab with dancer summary and order details |

---

### Technical Details

#### FOC Toggle in POS Cart Sidebar

Added between the discount section and the total:

```typescript
// New state
const [isFOC, setIsFOC] = useState(false);
const [focDancerName, setFocDancerName] = useState('');

// When FOC is on, override grandTotal to 0
const grandTotal = isFOC ? 0 : (existingTotal + total);
```

#### FOC Payment Handler

```typescript
async function handleFOCConfirm() {
  // Create order, add items
  const newOrder = await createOrder(selectedTable?.id || null, customerName);
  await addOrderItemsBatch(newOrder.id, batchItems);
  
  // Mark as FOC with full discount
  await supabase.from('orders').update({
    is_foc: true,
    foc_dancer_name: focDancerName,
    discount_amount: subtotal,
    total_amount: 0,
  }).eq('id', newOrder.id);
  
  // Transition states and finalize at 0
  await sendToKitchen(newOrder.id);
  await markAsServed(newOrder.id);
  await requestBill(newOrder.id);
  await finalizePayment(newOrder.id, 0, 'cash');
}
```

#### FOC Report Query

```typescript
// Query orders where is_foc = true
const { data } = await supabase
  .from('orders')
  .select('*, order_items(*, menu_item:menu_items(name, price))')
  .eq('is_foc', true)
  .gte('created_at', startDate)
  .lte('created_at', endDate);
```

#### Export Support

FOC data will be included in CSV export with columns: Order #, Date, Dancer Name, Items, Value, Staff.

