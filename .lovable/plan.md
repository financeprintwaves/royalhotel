
## Plan: OMR Standardization, Fast Auto-Print, and Branch Isolation

### Summary
This plan addresses four key requirements:
1. **OMR Currency Standardization** - Ensure all amounts display as "X.XXX OMR" format everywhere
2. **Instant Auto-Print on Payment** - Print receipt automatically to default printer without delays
3. **Branch Data Isolation** - Menu, categories, and data visible only to the assigned branch (except admin sees all)
4. **Branch Type Distinction** - Each branch operates independently (bar vs restaurant)

---

### Part 1: OMR Currency Standardization

**Current State:**
Most files already use `.toFixed(3) + " OMR"` format, but some areas are inconsistent.

**Files to Audit and Standardize:**

| File | Current | Fix Needed |
|------|---------|------------|
| src/pages/POS.tsx | Most prices use .toFixed(3) | Ensure all cart/payment amounts use OMR format |
| src/pages/Orders.tsx | Uses .toFixed(3) OMR | Already correct |
| src/components/Receipt.tsx | Uses .toFixed(3) OMR | Already correct |
| src/pages/Inventory.tsx | Uses .toFixed(2) | Change to .toFixed(3) OMR |
| src/components/ShiftReport.tsx | Check format | Standardize to OMR |
| src/components/PrintableReport.tsx | Check format | Standardize to OMR |

**Create Utility Function:**
Add a centralized currency formatter to ensure consistency:
```typescript
// src/lib/currency.ts
export const formatOMR = (amount: number): string => `${amount.toFixed(3)} OMR`;
```

---

### Part 2: Fast Auto-Print on Payment Success

**Current Issue:**
- ReceiptDialog opens a new window, writes HTML, then prints with 250ms delay
- This causes popup blockers and slow printing

**Solution:**
Implement direct print using `react-to-print` with immediate trigger:

1. **Remove popup-based printing** - Instead, use an invisible iframe approach
2. **Trigger print immediately** on payment success without dialog
3. **Use `react-to-print` library** (already installed) for reliable silent printing

**Updated Flow:**
```
Payment Success
    ↓
Show celebration overlay (500ms)
    ↓
Auto-print to default printer (no dialog)
    ↓
Close overlay
```

**ReceiptDialog Changes:**
```typescript
// Use react-to-print with useReactToPrint hook
const handlePrint = useReactToPrint({
  content: () => receiptRef.current,
  documentTitle: `Receipt-${order?.order_number}`,
  removeAfterPrint: true,
});

// Auto-trigger on mount when autoPrint=true
useEffect(() => {
  if (open && autoPrint && !hasPrinted) {
    handlePrint(); // Immediate print, no 500ms delay
    setHasPrinted(true);
  }
}, [open, autoPrint]);
```

**POS.tsx Changes:**
- Reduce the success overlay display time
- Trigger print synchronously with payment success

---

### Part 3: Branch Data Isolation

**Requirement:**
- Admin: Can see and manage ALL branches' data
- Manager/Waiter: Can ONLY see their assigned branch's data

**Current State Analysis:**
RLS policies already enforce branch isolation at database level. The issue is that the **React Query hooks don't pass branchId** consistently.

**Files Requiring Updates:**

| File | Current Behavior | Required Change |
|------|------------------|-----------------|
| useMenuData.ts (useCategories) | No branch filter | Pass user's branch_id |
| useMenuData.ts (useMenuItems) | No branch filter | Pass user's branch_id |
| menuService.ts (getCategories) | No branch filter | Add optional branchId param |
| menuService.ts (getMenuItems) | No branch filter | Add optional branchId param |
| POS.tsx | Uses hooks without branch context | Pass selectedBranch to hooks |

**Service Layer Updates (menuService.ts):**
```typescript
export async function getCategories(branchId?: string): Promise<Category[]> {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // Admin with branchId filter, or RLS handles automatically
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Category[];
}
```

**Hook Updates (useMenuData.ts):**
```typescript
export function useCategories(branchId?: string) {
  return useQuery({
    queryKey: ['categories', branchId],
    queryFn: () => getCategories(branchId),
    // ... existing config
  });
}
```

**POS.tsx Integration:**
```typescript
const { data: categories = [] } = useCategories(selectedBranch || undefined);
const { data: menuItems = [] } = useMenuItems(undefined, selectedBranch || undefined);
```

---

### Part 4: Branch-Specific Views for Non-Admins

**UI Behavior by Role:**

| Role | POS Floor View | Menu View | Categories |
|------|----------------|-----------|------------|
| Admin | Branch selector dropdown | All branches | All |
| Manager | Locked to assigned branch | Own branch only | Own only |
| Waiter | Locked to assigned branch | Own branch only | Own only |
| Cashier | Locked to assigned branch | Own branch only | Own only |

**Current Implementation (Already Correct):**
- BranchSelector component already shows locked badge for non-admins
- POS.tsx already uses `canSwitchBranch = isAdmin()` for branch selector

**What Needs Fixing:**
The hooks need to default to user's branch when no branchId is specified:

```typescript
// In hooks, use profile.branch_id as default for non-admins
export function useCategories(branchId?: string) {
  const { profile, isAdmin } = useAuth();
  const effectiveBranchId = branchId || (!isAdmin() ? profile?.branch_id : undefined);
  
  return useQuery({
    queryKey: ['categories', effectiveBranchId],
    queryFn: () => getCategories(effectiveBranchId),
  });
}
```

---

### File Changes Summary

| File | Action | Changes |
|------|--------|---------|
| src/lib/currency.ts | Create | Add formatOMR utility function |
| src/services/menuService.ts | Modify | Add branchId parameter to getCategories and getMenuItems |
| src/hooks/useMenuData.ts | Modify | Pass branchId to services, use profile.branch_id for non-admins |
| src/components/ReceiptDialog.tsx | Modify | Use react-to-print for fast direct printing |
| src/pages/POS.tsx | Modify | Pass selectedBranch to hooks, reduce print delay |
| src/pages/Inventory.tsx | Modify | Change .toFixed(2) to formatOMR |
| src/components/ShiftReport.tsx | Modify | Standardize currency formatting to OMR |

---

### Implementation Priority

1. **Branch Isolation First** - Critical for multi-branch operation
2. **Fast Auto-Print** - Improve checkout speed
3. **OMR Standardization** - Consistency improvement

---

### Testing Checklist

After implementation:
- [ ] Login as admin - verify can switch branches and see all data
- [ ] Login as manager - verify locked to own branch, only see own menu/categories
- [ ] Process payment - verify receipt prints immediately without popup
- [ ] Check all currency displays show X.XXX OMR format

