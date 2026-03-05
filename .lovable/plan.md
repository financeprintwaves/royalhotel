

## Fix: Manager Edit/Cancel Orders + Verify Visibility

### Root Cause
The manager for Royal Hyderabadi **can** see orders (RLS is correct), but:
1. **Edit/Cancel buttons in POS Orders tab** are gated by `isAdmin()` — managers can't see them
2. **Orders page** has Cancel but **no Edit button** for anyone
3. Both pages need `isManagerOrAdmin()` instead of `isAdmin()` for edit/cancel controls

### Changes

#### 1. POS.tsx — Allow managers to edit/cancel orders
- Line 1346: Change `{isAdmin() && (` to `{isManagerOrAdminUser && (` for active orders edit/cancel
- Line 1400: Same change for completed orders edit button
- This gives managers the same order management capabilities as admins within their branch

#### 2. Orders.tsx — Add Edit button + manager permissions
- Import `Edit` icon and `cancelOrder` already imported
- Add `isManagerOrAdmin` from `useAuth()` (currently only imports `isAdmin`)
- Add Edit button next to Cancel for active orders (navigates to POS with order loaded, or similar pattern)
- Gate Cancel button behind `isManagerOrAdmin()` instead of showing for everyone
- Add Edit button for completed orders (managers can re-open for corrections)

#### 3. Orders.tsx — Add handleEditOrder
- Add a function to navigate to `/pos` with order context, or replicate the POS edit pattern (navigate with state)

### Files Modified
| File | Change |
|------|--------|
| `src/pages/POS.tsx` | Change `isAdmin()` to `isManagerOrAdminUser` for edit/cancel buttons (2 locations) |
| `src/pages/Orders.tsx` | Add `isManagerOrAdmin` auth check, add Edit button, gate Cancel behind manager+ role |

