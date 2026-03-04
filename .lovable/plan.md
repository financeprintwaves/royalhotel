
## Fix: Admin Can't See Branch Orders

### Root Cause Analysis

After investigating the database and code:

1. **All 662 orders** exist in branch `Royal Hyderabadi Biryani Restaurant` (c39f6b77...)
2. **The admin account** (iqbalussain@gmail.com) is assigned to branch `Arabic Bar` (a1111111...)
3. **RLS policies are correct** — admin can see all orders via `is_admin(auth.uid())`
4. **The `getOrders()` function** does NOT filter by branch (relies on RLS), so admin should see all orders

The actual issues are:

**Issue A: POS Tables view filters by `selectedBranch`** — When admin loads POS, `selectedBranch` defaults to their own branch (Arabic Bar) or `branches[0]`. The tables grid only shows that branch's tables. If admin selects "Royal Hyderabadi" from the branch dropdown, they see those tables — but the **Orders tab** inside POS fetches ALL orders (no branch filter), which can be confusing.

**Issue B: Orders view has no branch awareness** — `getOrders()` returns 50 most recent orders across ALL branches. Active orders from Royal Hyderabadi should appear. The issue may be that the admin is on the Tables view and expects to see order indicators on tables, but tables are loaded for Arabic Bar (which has no orders).

**Issue C: Default limit of 50 may miss some active orders** — Most recent 50 includes today's PAID orders, pushing older active ones out. Active CREATED orders from March 3 may not appear if there are more than 50 newer PAID orders from March 4.

### Fix Plan

#### 1. Filter orders by selected branch in POS (src/pages/POS.tsx + src/services/orderService.ts)

Add `branchId` parameter to `getOrders()` and pass `selectedBranch` from POS:

```typescript
// orderService.ts - add branch filter
export async function getOrders(statusFilter?, limit = 50, branchId?: string) {
  let query = supabase.from('orders').select(...)...;
  if (branchId) query = query.eq('branch_id', branchId);
  ...
}
```

Update `loadAllOrders` in POS.tsx to pass `selectedBranch`:
```typescript
const loadAllOrders = useCallback(async () => {
  const data = await getOrders(undefined, 50, selectedBranch || undefined);
  setAllOrders(data);
}, [selectedBranch]);
```

#### 2. Increase limit for active orders (src/services/orderService.ts)

Change default limit from 50 to 100, and fetch active orders separately to ensure they always appear:

#### 3. Reload orders when branch changes (src/pages/POS.tsx)

Add `selectedBranch` to the dependency array of the orders loading effect so orders refresh when admin switches branches.

### Files Modified

| File | Change |
|------|--------|
| `src/services/orderService.ts` | Add optional `branchId` parameter to `getOrders()` and `searchOrders()` |
| `src/pages/POS.tsx` | Pass `selectedBranch` to `getOrders()`, add to dependency array |
| `src/pages/Orders.tsx` | Add branch selector for admin, pass branch filter |
