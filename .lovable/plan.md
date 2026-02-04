

## Plan: Kitchen Role Enhancements & Order Page Permissions

### Summary
This plan implements two major features:
1. **Kitchen Role Enhancements** - Dedicated kitchen tab with branch filtering, status management, summary stats, and date filtering
2. **Order Page Permissions** - Role-based item management (Manager: add only, Admin: add/remove)

---

### Part 1: Kitchen Role Enhancements

**Current State:**
- Kitchen view exists in POS.tsx (lines 937-996) as a basic display
- Standalone `/kitchen` page (KitchenDisplay.tsx) exists but lacks advanced features
- No role-based visibility for kitchen tab
- No summary stats, date filter, or grouping

**Changes Required:**

#### 1.1 Role-Based Kitchen Tab Visibility

| File | Change |
|------|--------|
| src/pages/POS.tsx | Hide "Kitchen" tab in header unless user has `kitchen` or `manager` or `admin` role |
| src/pages/Dashboard.tsx | Only show Kitchen Display link for kitchen/manager/admin roles |

**Implementation:**
```typescript
// In POS.tsx header tabs
const canViewKitchen = roles.includes('kitchen') || roles.includes('manager') || roles.includes('admin');

// Conditionally render Kitchen tab
{canViewKitchen && (
  <Button variant="ghost" onClick={() => setView('kitchen')}>
    <ChefHat className="h-4 w-4 mr-2" />Kitchen
  </Button>
)}
```

#### 1.2 Branch-Level Filtering for Kitchen Orders

**Current:** `getKitchenOrders()` fetches all SENT_TO_KITCHEN orders (RLS handles branch filtering)
**Change:** Add explicit branch filtering for admins who can see multiple branches

| File | Change |
|------|--------|
| src/services/orderService.ts | Add optional `branchId` param to `getKitchenOrders()` |
| src/pages/POS.tsx | Pass `selectedBranch` to kitchen orders query |

```typescript
// orderService.ts
export async function getKitchenOrders(branchId?: string, dateFilter?: Date): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`...`)
    .eq('order_status', 'SENT_TO_KITCHEN');
  
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }
  
  if (dateFilter) {
    const startOfDay = new Date(dateFilter);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateFilter);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.gte('created_at', startOfDay.toISOString())
                 .lte('created_at', endOfDay.toISOString());
  }
  
  return query;
}
```

#### 1.3 Enhanced Kitchen Display with Status & Summary

**New Kitchen View Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ 🍳 Kitchen Display                          [Date Filter ▼] │
├──────────────────────────────────────────────────────────────┤
│ Summary: Total: 8 | Pending: 5 | Ready: 3                   │
├──────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│ │ ARB2602001  │ │ ARB2602002  │ │ ARB2602003  │              │
│ │ T5          │ │ Takeaway    │ │ T12         │              │
│ │ ────────────│ │ ────────────│ │ ────────────│              │
│ │ 2x Biryani  │ │ 1x Burger   │ │ 3x Pizza    │              │
│ │ 1x Naan     │ │ 2x Fries    │ │             │              │
│ │ ────────────│ │ ────────────│ │ ────────────│              │
│ │ [PENDING]   │ │ [READY ✓]   │ │ [PENDING]   │              │
│ │ [Mark Ready]│ │ [Served ✓]  │ │ [Mark Ready]│              │
│ └─────────────┘ └─────────────┘ └─────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

**Status Flow:**
- SENT_TO_KITCHEN = "Pending" (yellow badge)
- Kitchen clicks "Mark Ready" → Status stays SENT_TO_KITCHEN but internal flag `kitchen_ready` = true (or we use existing SERVED status)
- Actually, simpler: Kitchen marks as SERVED (already exists)

**Changes to Kitchen View in POS.tsx:**

| Feature | Implementation |
|---------|----------------|
| Order Number Display | Use `order.order_number` as primary identifier |
| Status Badge | Show "Pending" for SENT_TO_KITCHEN |
| Mark Ready Button | Already exists (`handleMarkServed`) |
| Summary Section | Count orders by status |
| Date Filter | Add date picker with default = today |
| Group by Order Number | Sort orders by `order_number` ascending |

#### 1.4 Date Filter & Summary Stats

```typescript
// State additions in POS.tsx for kitchen view
const [kitchenDateFilter, setKitchenDateFilter] = useState<Date>(new Date());

// Summary calculations
const kitchenPending = kitchenOrders.filter(o => o.order_status === 'SENT_TO_KITCHEN').length;
const kitchenServed = allOrders.filter(o => 
  o.order_status === 'SERVED' && 
  new Date(o.updated_at).toDateString() === kitchenDateFilter.toDateString()
).length;
```

---

### Part 2: Order Page Permissions (Add/Remove Items)

**Current State:**
- Cart items can be added/removed by anyone (removeFromCart function line 319)
- No role-based restrictions on item management
- Existing orders show "Previous Items" but no editing

**Requirements:**
- **Manager**: Can add items only (cannot remove existing items)
- **Admin**: Can add and remove items
- **Cashier**: Standard operations only

**Changes Required:**

#### 2.1 Add Role Check Helper

```typescript
// In POS.tsx
const canRemoveItems = isAdmin(); // Only admin can remove
const canAddItems = isManagerOrAdmin() || roles.includes('cashier'); // Manager, Admin, Cashier can add
```

#### 2.2 Conditionally Show Remove Button

| File | Location | Change |
|------|----------|--------|
| src/pages/POS.tsx | Cart item row (lines 1094-1101) | Hide Trash button unless `canRemoveItems` |
| src/pages/POS.tsx | Quantity minus button | For managers: disable if quantity would go to 0 |

**Code Change:**
```typescript
// Cart item in sidebar
<div className="flex items-center gap-1">
  <Button 
    size="icon" 
    variant="ghost" 
    className="h-6 w-6" 
    onClick={() => updateCartQuantity(...)}
    // Manager: disable if it would remove item
    disabled={!canRemoveItems && item.quantity <= 1}
  >
    <Minus className="h-3 w-3" />
  </Button>
  <span>{item.quantity}</span>
  <Button onClick={() => updateCartQuantity(+1)}>
    <Plus className="h-3 w-3" />
  </Button>
  {/* Only show delete for admin */}
  {canRemoveItems && (
    <Button onClick={() => removeFromCart(...)}>
      <Trash2 className="h-3 w-3" />
    </Button>
  )}
</div>
```

#### 2.3 Bill Editing Restrictions

For existing orders (when `existingOrder` is set):

| Role | Can Add Items | Can Remove Items | Can Edit Quantity Down |
|------|---------------|------------------|------------------------|
| Admin | ✅ | ✅ | ✅ |
| Manager | ✅ | ❌ | ❌ (can only increase) |
| Cashier | ✅ | ❌ | ❌ |

**Note:** For items already saved to the order (existingOrder.order_items), backend RLS should also enforce this. Frontend provides UX restrictions.

---

### File Changes Summary

| File | Action | Changes |
|------|--------|---------|
| src/pages/POS.tsx | Modify | Kitchen tab visibility, summary stats, date filter, role-based item removal |
| src/services/orderService.ts | Modify | Add branchId and dateFilter params to getKitchenOrders |
| src/pages/Dashboard.tsx | Modify | Kitchen Display link visibility based on role |
| src/pages/KitchenDisplay.tsx | Modify | Add summary stats, date filter, sort by order number |
| src/contexts/AuthContext.tsx | No change | Already has hasRole(), isAdmin(), isManagerOrAdmin() |

---

### Technical Implementation Details

#### Kitchen View Summary Section (POS.tsx)
```typescript
<div className="flex items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
  <div className="flex-1">
    <span className="text-sm text-muted-foreground">Total Orders</span>
    <p className="text-2xl font-bold">{kitchenOrders.length}</p>
  </div>
  <div className="flex-1">
    <span className="text-sm text-muted-foreground">Pending</span>
    <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
  </div>
  <div className="flex-1">
    <span className="text-sm text-muted-foreground">Ready/Served</span>
    <p className="text-2xl font-bold text-green-600">{servedCount}</p>
  </div>
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline">
        <Calendar className="h-4 w-4 mr-2" />
        {format(kitchenDateFilter, 'MMM dd')}
      </Button>
    </PopoverTrigger>
    <PopoverContent>
      <Calendar mode="single" selected={kitchenDateFilter} onSelect={setKitchenDateFilter} />
    </PopoverContent>
  </Popover>
</div>
```

#### Role-Based Visibility Check
```typescript
// Kitchen tab visibility
const hasKitchenAccess = roles.includes('kitchen') || roles.includes('manager') || roles.includes('admin');

// Item removal permission
const canRemoveCartItems = isAdmin();
const canDecreaseQuantity = isAdmin() || !existingOrder; // Managers can decrease only for new items
```

---

### Order of Implementation

1. **Add role-based kitchen tab visibility** (POS.tsx header)
2. **Update getKitchenOrders** with branch + date filtering (orderService.ts)
3. **Add kitchen summary section** (POS.tsx kitchen view)
4. **Add date filter to kitchen view** (POS.tsx)
5. **Sort kitchen orders by order_number** (POS.tsx)
6. **Add role-based item removal** (POS.tsx cart sidebar)
7. **Update Dashboard links** for role visibility (Dashboard.tsx)
8. **Update standalone KitchenDisplay.tsx** with matching features

---

### UI Visibility Summary

| Component | Admin | Manager | Cashier | Kitchen |
|-----------|-------|---------|---------|---------|
| Kitchen Tab (POS) | ✅ | ✅ | ❌ | ✅ |
| Kitchen Display Link (Dashboard) | ✅ | ✅ | ❌ | ✅ |
| Add Items to Order | ✅ | ✅ | ✅ | ❌ |
| Remove Items from Order | ✅ | ❌ | ❌ | ❌ |
| Decrease Item Quantity | ✅ | ❌ (new items only) | ❌ | ❌ |
| Mark as Served (Kitchen) | ✅ | ✅ | ❌ | ✅ |

