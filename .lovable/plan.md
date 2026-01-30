

## Plan: Remove Tax, Add Branch Filter to Reports, Smart Kitchen Routing & Takeaway Invoice Flow

### Summary
This plan addresses four requirements in an efficient implementation:
1. **Remove Tax** - Since all menu item prices already include 5% tax, remove tax calculation from frontend and backend
2. **Branch Filter in Reports** - Add branch selector to the Reports page header
3. **Smart Kitchen Routing** - Only send items from "kitchen" categories to kitchen; others go directly to SERVED
4. **Takeaway Invoice Flow** - For takeaway orders, collect payment first before sending to preparation

---

### Part 1: Remove Tax Calculation

**Current State:**
- `orderService.ts` line 282-284: Applies 10% tax to all orders
- `NewOrder.tsx` line 108: Calculates 10% tax in cart display
- Database has `tax_amount` column storing calculated tax

**Changes Required:**

| File | Current | Change |
|------|---------|--------|
| src/services/orderService.ts | `taxRate = 0.10`, calculates taxAmount | Set `taxRate = 0`, `taxAmount = 0` |
| src/pages/NewOrder.tsx | Shows Tax (10%) line in cart | Remove tax display line |
| src/pages/POS.tsx | No tax display (already correct) | No change needed |
| src/components/Receipt.tsx | Already omits tax display | No change needed |

**Backend Change (recalculateOrderTotals):**
```typescript
// Change from:
const taxRate = 0.10;
const taxAmount = subtotal * taxRate;
const totalAmount = subtotal + taxAmount;

// To:
const taxAmount = 0; // Prices include tax
const totalAmount = subtotal; // No additional tax
```

---

### Part 2: Branch Filter in Reports Page

**Current State:**
- Reports page has DateRangePicker but no branch filter
- RLS handles data isolation, but admins should be able to filter by branch

**Implementation:**
Add BranchSelector component to Reports header, pass `branchId` to all reporting service functions.

**UI Change (Reports.tsx header):**
```
[DateRangePicker] [BranchSelector] | [Overview] [Sales] [Payments] [Items] [Summary] | [Export]
```

**Service Changes (reportingService.ts):**
Update all functions to accept optional `branchId` parameter and filter queries:
```typescript
export async function getDailySales(params: DateRangeParams, branchId?: string): Promise<DailySales[]> {
  let query = supabase
    .from('orders')
    .select('...')
    .gte('created_at', ...)
    .in('order_status', ['PAID', 'CLOSED']);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }
  // ...
}
```

---

### Part 3: Smart Kitchen Routing by Category

**Current State:**
- All items sent via "Send to Kitchen" go to SENT_TO_KITCHEN status
- Kitchen display shows all orders with SENT_TO_KITCHEN status

**Requirement:**
- Only items from categories marked as "kitchen items" should go to kitchen
- Bar/drink items should bypass kitchen (go directly to SERVED or ready)

**Database Change (categories table):**
Add new column:
```sql
ALTER TABLE categories 
ADD COLUMN requires_kitchen BOOLEAN DEFAULT false;
```

**UI Change (MenuManagement.tsx):**
Add toggle in category form:
```
"Kitchen Item" [Toggle Switch]
- When ON: Items in this category are sent to kitchen for preparation
- When OFF: Items are served immediately (bar/drinks)
```

**Logic Change (POS.tsx handleSendToKitchen):**
```typescript
// Check if any cart items require kitchen
const hasKitchenItems = cart.some(item => {
  const category = categories.find(c => c.id === item.menuItem.category_id);
  return category?.requires_kitchen;
});

if (hasKitchenItems) {
  await sendToKitchen(orderId); // Status: SENT_TO_KITCHEN
} else {
  // No kitchen items - go directly to SERVED
  await markAsServed(orderId); // Status: SERVED
}
```

---

### Part 4: Takeaway Invoice & Payment-First Flow

**Current State:**
- Takeaway orders follow same flow as dine-in: Create order → Send to Kitchen → Serve → Bill → Pay
- No special invoice handling for takeaway

**Requirement:**
- Takeaway should collect payment FIRST
- Print invoice/receipt immediately
- Then prepare the order

**New Takeaway Flow:**
```
1. Add items to cart
2. Click "Pay & Print" button (for takeaway only)
3. Payment dialog opens
4. Process payment → Print receipt immediately
5. Order goes to kitchen (if has kitchen items) or marked complete
```

**UI Changes (POS.tsx):**
For takeaway orders, show different action buttons:
- Dine-in: "Send to Kitchen" (primary), "Pay Now" (secondary)
- Takeaway: "Pay & Collect" (primary) - Collects payment first, then prints receipt

**Modified Payment Flow for Takeaway:**
```typescript
async function handleTakeawayPayment() {
  // 1. Create order
  const newOrder = await createOrder(null, customerName);
  
  // 2. Add items
  await addOrderItemsBatch(newOrder.id, batchItems);
  
  // 3. Process payment immediately
  await finalizePayment(newOrder.id, paymentTotal, paymentMethod, ref);
  
  // 4. Print receipt
  setAutoPrintOrder(updatedOrder);
  setShowPaymentSuccess(true);
  
  // 5. Send kitchen items to kitchen (if any)
  if (hasKitchenItems) {
    // Order already paid, just notify kitchen
    await supabase.from('orders').update({ order_status: 'SENT_TO_KITCHEN' }).eq('id', newOrder.id);
  }
}
```

---

### File Changes Summary

| File | Action | Changes |
|------|--------|---------|
| supabase/migrations/new | Create | Add `requires_kitchen` column to categories |
| src/services/orderService.ts | Modify | Set taxRate to 0, taxAmount to 0 |
| src/services/reportingService.ts | Modify | Add branchId param to all functions |
| src/pages/Reports.tsx | Modify | Add BranchSelector to header |
| src/pages/POS.tsx | Modify | Smart kitchen routing logic, takeaway payment-first flow |
| src/pages/NewOrder.tsx | Modify | Remove tax calculation and display |
| src/pages/MenuManagement.tsx | Modify | Add "Kitchen Item" toggle in category form |
| src/types/pos.ts | Modify | Add `requires_kitchen` to Category interface |

---

### Database Migration

```sql
-- Add kitchen routing flag to categories
ALTER TABLE public.categories 
ADD COLUMN requires_kitchen BOOLEAN NOT NULL DEFAULT false;

-- Set default: Food categories require kitchen, drink categories don't
COMMENT ON COLUMN public.categories.requires_kitchen IS 
  'When true, items in this category are sent to kitchen for preparation';
```

---

### Summary of Changes

| Requirement | Solution |
|-------------|----------|
| Remove tax | Set taxRate=0 in orderService, remove tax display in NewOrder |
| Branch filter in Reports | Add BranchSelector component, update reportingService |
| Kitchen item routing | Add `requires_kitchen` flag to categories, route based on flag |
| Takeaway invoice first | Payment-first flow for takeaway, print receipt immediately |

---

### Order Flow Comparison

**Before (All Orders):**
```
Create → Add Items → Send to Kitchen → Served → Bill → Pay → Close
```

**After (Dine-In with Kitchen Items):**
```
Create → Add Items → Send to Kitchen → Served → Bill → Pay → Close
```

**After (Dine-In with Bar Items Only):**
```
Create → Add Items → Mark Served (skip kitchen) → Bill → Pay → Close
```

**After (Takeaway):**
```
Create → Add Items → PAY FIRST → Print Receipt → Send to Kitchen (if needed) → Ready for Pickup
```

