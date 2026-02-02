

## Plan: Optimize Payment Speed + Add Portion Sizes (Small/Medium/Large)

### Status: ✅ COMPLETED

---

### Part 1: Payment Speed Optimization ✅

**Changes Made:**
- Removed redundant sequential RPC calls (3 → 1) for takeaway payments
- Eliminated extra `getOrder` refetch after payment by using cart data for receipt
- Payment now goes directly to BILL_REQUESTED → PAID in optimized flow

**Result:** Payment processing is now significantly faster (7 RPCs → 2 RPCs)

---

### Part 2: Portion Size Options ✅

**Database:**
- Added `portion_options` JSONB column to `menu_items` table

**Types (pos.ts):**
- Added `PortionOption` interface
- Updated `MenuItem` to include `portion_options`
- Updated `CartItem` to include `selectedPortion`

**Services (menuService.ts):**
- Added `portionOptions` support to `createMenuItem`
- Added `updateMenuItemWithPortions` function

**Components:**
- Created `PortionSelectionDialog.tsx` - Generic dialog for portion/serving selection
- Removed old `ServingSelectionDialog.tsx`

**UI (MenuManagement.tsx):**
- Added portion options section to menu item dialog
- Can add/edit/remove portions with name, price, and size

**POS.tsx:**
- Updated to use `PortionSelectionDialog`
- Support for both portion options and legacy bottle/shot selection
- Cart now tracks `selectedPortion` for proper pricing

---

### Files Changed

| File | Status | Changes |
|------|--------|---------|
| src/types/pos.ts | ✅ | Added PortionOption, updated MenuItem, CartItem |
| src/services/menuService.ts | ✅ | Added portion options support |
| src/components/PortionSelectionDialog.tsx | ✅ New | Generic portion picker |
| src/components/ServingSelectionDialog.tsx | ❌ Deleted | Replaced by PortionSelectionDialog |
| src/pages/MenuManagement.tsx | ✅ | Portion options UI in item form |
| src/pages/POS.tsx | ✅ | Optimized payment + portion selection |


