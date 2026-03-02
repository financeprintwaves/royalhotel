

## POS Overhaul: Replace Floor with Tables, Super-Fast Payments, Table Context in Menu

### Overview
Replace the FloorCanvas view with the Tables page grid, remove AFS card terminal references, make Cash/Card payments instant (mark paid + print in one tap), and show the selected table/takeaway indicator in the menu view with the ability to change tables mid-order.

---

### 1. Replace Floor View with Tables Grid (src/pages/POS.tsx)

**Remove** the entire `view === 'floor'` block (lines 936-1001) including the FloorCanvas component and branch selector header.

**Replace with** a compact 2-column table grid (same style as Tables.tsx) embedded directly in the POS terminal:
- 2-column grid of table cards with status colors (green/red/yellow/blue)
- Each card shows: table number, capacity, status badge
- Clicking an available/occupied table calls `handleSelectTable(table)` to go to menu view
- **Add a prominent "Takeaway" card** at the top of the grid (styled differently, e.g. orange gradient) that calls `handleTakeout()`
- Branch selector dropdown (admin only) stays at the top
- Remove the `FloorCanvas` import since it's no longer used
- Remove `'floor'` from `ViewType` -- rename to `'tables'` and update all references

### 2. Add Takeaway Option to Tables Page (src/pages/Tables.tsx)

- Add a special "Takeaway" card at the top of the grid (before table cards)
- Styled with orange gradient, shopping bag icon
- Links to `/pos` with takeaway mode (or `/new-order` to match existing pattern)

### 3. Table/Takeaway Indicator in Menu View (src/pages/POS.tsx)

Add a **sticky info bar** at the top of the menu view (above search bar) showing:
- Current table number (e.g. "T5") or "TW" for takeaway
- A "Change Table" button that switches back to the tables view
- Existing order badge if applicable

```
+------------------------------------------+
| [T5]  Table 5 - Dine In    [Change Table]|
+------------------------------------------+
| [Search...]                              |
```

For takeaway:
```
+------------------------------------------+
| [TW]  Takeaway              [Change]     |
+------------------------------------------+
```

### 4. Super-Fast Payment -- One-Tap Cash/Card (src/pages/POS.tsx)

**Remove the payment dialog for single Cash/Card payments.** Instead:

- When "PAY NOW" is clicked, show **3 large buttons directly** (no dialog):
  - **Cash** -- immediately calls `quickPayOrder(orderId, total, 'cash')`, prints invoice, shows receipt
  - **Card** -- immediately calls `quickPayOrder(orderId, total, 'card')`, prints invoice, shows receipt
  - **Mobile** -- immediately calls `quickPayOrder(orderId, total, 'mobile')`, prints invoice, shows receipt

- The payment dialog is **only** shown for **Split Payment** scenarios

- Flow: Tap "PAY" -> Tap "Cash" -> Done (2 taps total, instant)

**Remove AFS-related code**: The memory mentions AFS card terminal integration, but no actual code exists in the codebase. No changes needed -- it was likely removed previously. The payment dialog's card flow will simply mark as paid without waiting for any terminal.

### 5. Performance: Remove Animation Overhead

- Remove `active:scale-[0.97]` and `transition-all duration-150` from menu item cards (per performance-first memory)
- Remove `animate-badge-pulse` from cart badge
- Use `transition-none` where applicable

---

### Files Modified

| File | Changes |
|------|---------|
| `src/pages/POS.tsx` | Replace floor view with tables grid, add table context bar in menu, one-tap payment flow, remove FloorCanvas import, add takeaway card |
| `src/pages/Tables.tsx` | Add takeaway card at top of grid |

### What Won't Change
- All payment RPCs and business logic
- Desktop sidebar cart
- Kitchen display and orders view
- Split payment flow (keeps dialog)
- Printing pipeline
