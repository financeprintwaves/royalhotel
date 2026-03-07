
Issue confirmed: this is not a role/RLS visibility bug anymore. The manager is authenticated, has `manager` role, and has a valid branch assignment. The failing point is the orders fetch itself timing out (`57014 statement timeout`) on this query shape:

- `orders` + embedded `restaurant_tables` + embedded `order_items(menu_items)` + embedded `waiter profiles`
- `limit=100`, ordered by `created_at desc`
- fails consistently from both Dashboard and Orders page logs

Why it regressed:
1) The current list query is too heavy for this endpoint pattern (deep embedded relations under RLS).
2) Orders page can start with `selectedBranchId = null` (state initialized before profile settles), so first loads are unscoped at app level.
3) Dashboard is using the same heavy `getOrders()` call just to compute summary cards.

Implementation plan (approved-scope fix):
1. Stabilize branch scoping on Orders page
   - File: `src/pages/Orders.tsx`
   - Add effect to sync `selectedBranchId` from `profile.branch_id` for non-admin users after profile load.
   - Ensure initial/refresh loads always pass an explicit branch filter for manager/cashier/kitchen users.

2. Refactor order list data fetching to avoid deep embedded query timeout
   - File: `src/services/orderService.ts`
   - Split `getOrders()` into two-step fetch:
     - Step A (fast): fetch order header rows + table + waiter name (no embedded order_items)
     - Step B (batched): fetch `order_items` for returned order IDs with one query, then map/group client-side
   - Keep returned shape compatible with existing UI (`order.order_items` still available) so pages/components don’t break.

3. Add a lightweight dashboard-specific query path
   - Files: `src/services/orderService.ts`, `src/pages/Dashboard.tsx`
   - Create `getOrderStats()` (only required fields for counts/revenue).
   - Replace Dashboard’s `getOrders()` call with `getOrderStats()` to remove unnecessary heavy payload and avoid dashboard failure when orders list is slow.

4. Add graceful timeout fallback for UI continuity
   - Files: `src/pages/Orders.tsx`, optionally `src/pages/POS.tsx`
   - If detailed items enrichment fails/timeouts, show order headers (number/status/total/time/table/waiter) and continue rendering page.
   - Keep realtime connectivity indicator accurate (`Live` only when data call succeeds).

5. Verification checklist
   - Log in as Royal Hyderabadi manager.
   - Dashboard loads cards without timeout errors.
   - Orders page shows branch orders (active/completed counts populated).
   - POS Orders tab loads list without timeout.
   - Edit/Cancel buttons remain visible for manager on both POS and Orders pages.
   - Confirm network no longer shows repeated `57014` for orders list endpoint.

Technical notes (why this approach)
- Existing DB indexes are present (`orders`, `order_items`), so fastest win is query-shape reduction, not schema redesign.
- This keeps current security model intact (no weakening of RLS).
- It also isolates heavy relation loading away from high-frequency views (Dashboard/Orders list), which is the main cause of perceived “no orders visible”.
