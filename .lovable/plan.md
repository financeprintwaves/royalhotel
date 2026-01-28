

## Plan: Branch Management, Foreign Key Fix, and Branch Selector Integration

### Summary
This plan addresses three interconnected issues:
1. **Branch Management UI** - Add a page for admins and managers to view/edit branches
2. **Schema Error Fix** - Add a proper foreign key relationship between `orders` and `profiles` to fix the "orders_created_by_fkey1" error
3. **Branch Selector Integration** - Show branch context in Menu Management and Inventory pages (admins can switch branches)

---

### Part 1: Fix Orders-Profiles Relationship Error

**Root Cause:**
The current code uses `waiter:profiles!orders_created_by_fkey1(full_name)` but no actual foreign key named `orders_created_by_fkey1` exists in the database. PostgREST requires explicit foreign key relationships to perform these joins.

**Solution:**
Add a proper foreign key constraint from `orders.created_by` to `profiles.user_id`.

| Table | Column | References |
|-------|--------|------------|
| orders | created_by | profiles.user_id |

**Database Migration:**
```sql
-- Add foreign key from orders.created_by to profiles.user_id
ALTER TABLE public.orders
ADD CONSTRAINT orders_created_by_fkey_profiles
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id)
ON DELETE SET NULL;
```

**Code Update (orderService.ts):**
Update the join hint to use the new constraint name:
```typescript
waiter:profiles!orders_created_by_fkey_profiles(full_name)
```

---

### Part 2: Branch Management Page

**New Route:** `/branches`

**Features:**
- List all branches with name, address, phone, order prefix
- Create new branch (admin + manager)
- Edit existing branch details
- Deactivate branch (admin only)
- Show branch statistics (tables, menu items, staff count)

**UI Components:**

| Component | Description |
|-----------|-------------|
| Branch List | Cards or table showing all branches |
| Branch Form Dialog | Create/edit branch with fields: name, address, phone, order prefix |
| Branch Stats | Quick stats per branch (table count, item count) |

**Access Control:**
- Admins: Full CRUD on all branches
- Managers: Can edit their assigned branch details only (name, address, phone)

**Navigation:**
Add "Branch Management" link to Dashboard for admins/managers.

---

### Part 3: Branch Display in Menu Management and Inventory

**Current State:**
- Menu items and inventory are filtered by user's branch via RLS
- No UI indication of which branch data is being shown
- Admins cannot switch to view other branches

**Enhanced UI:**

| Page | Change |
|------|--------|
| Menu Management | Add header showing current branch name + admin branch selector dropdown |
| Inventory | Add header showing current branch name + admin branch selector dropdown |

**Behavior:**
- Non-admins see their branch name (locked, no dropdown)
- Admins see a dropdown to switch between branches
- Switching branch reloads menu items/inventory for that branch

**Implementation Approach:**
1. Create `BranchSelector` component (reusable)
2. Modify `menuService.ts` to accept optional `branchId` parameter for admin cross-branch queries
3. Update Menu Management and Inventory pages to use branch selector

---

### Part 4: Add Branch Selection When Creating Menu Items

**Current State:**
Menu items are automatically assigned to the user's branch.

**Enhancement:**
When admins create menu items, show a branch selector dropdown so they can add items to any branch.

**UI Change in MenuManagement.tsx:**
Add "Branch" dropdown field in the "Add Menu Item" dialog (visible only to admins):
```
Branch: [Dropdown - Arabic Bar / Indian Bar / ...]
```

---

### Technical Implementation Details

**Database Migration (SQL):**
```sql
-- 1. Add foreign key for orders -> profiles relationship
ALTER TABLE public.orders
ADD CONSTRAINT orders_created_by_fkey_profiles
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id)
ON DELETE SET NULL;
```

**Files to Create:**

| File | Purpose |
|------|---------|
| src/pages/BranchManagement.tsx | Branch management page |
| src/components/BranchSelector.tsx | Reusable branch dropdown component |

**Files to Modify:**

| File | Changes |
|------|---------|
| src/services/orderService.ts | Update foreign key hint in select queries |
| src/services/menuService.ts | Add optional branchId parameter to getMenuItems/getCategories |
| src/services/inventoryService.ts | Add optional branchId parameter to getInventory |
| src/pages/MenuManagement.tsx | Add branch header display + admin branch selector + branch field in create item dialog |
| src/pages/Inventory.tsx | Add branch header display + admin branch selector |
| src/pages/Dashboard.tsx | Add "Branch Management" link for admins/managers |
| src/App.tsx | Add /branches route |
| src/hooks/useMenuData.ts | Update hooks to pass branchId |

---

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| supabase/migrations/new | Create | Add FK constraint orders -> profiles |
| src/pages/BranchManagement.tsx | Create | Full branch CRUD interface |
| src/components/BranchSelector.tsx | Create | Reusable branch picker component |
| src/services/orderService.ts | Modify | Fix FK hint to new constraint name |
| src/services/menuService.ts | Modify | Add branchId param for admin queries |
| src/services/inventoryService.ts | Modify | Add branchId param for admin queries |
| src/pages/MenuManagement.tsx | Modify | Branch display + selector + create form |
| src/pages/Inventory.tsx | Modify | Branch display + selector |
| src/pages/Dashboard.tsx | Modify | Add Branch Management quick action |
| src/App.tsx | Modify | Add /branches route |
| src/hooks/useMenuData.ts | Modify | Accept branchId in hooks |

---

### Security Considerations

1. **RLS Protection:** All branch queries are still protected by existing RLS policies
2. **Admin Override:** Admin branch switching works because `is_admin()` returns true, bypassing branch restrictions
3. **No Sensitive Data Exposure:** The profiles join only exposes `full_name`, not email/PIN/other fields

---

### UI Flow Diagrams

**Branch Management Access:**
```text
Dashboard
    |
    +-- [Admins/Managers] --> Branch Management (/branches)
                                |
                                +-- View all branches
                                +-- Create new branch (admin)
                                +-- Edit branch details
                                +-- Deactivate branch (admin)
```

**Menu/Inventory Branch Context:**
```text
Menu Management
    |
    +-- Header: "Menu Management - [Branch Name]"
    |
    +-- [Admin only] Branch Dropdown --> Switch to different branch
    |
    +-- Menu items filtered by selected branch
```

