

## Fix Currency: Replace All USD ($) with OMR and Use 3 Decimal Places

All dollar signs and 2-decimal formatting will be replaced with proper OMR formatting (3 decimal places) across every affected file.

### Files to Fix

| File | Issue |
|------|-------|
| `src/pages/NewOrder.tsx` | 5 places using `$` prefix and `toFixed(2)` instead of OMR |
| `src/pages/Dashboard.tsx` | Revenue card showing `$todayRevenue.toFixed(2)` |
| `src/pages/MenuManagement.tsx` | Menu item price showing `$item.price.toFixed(2)` |
| `src/pages/Inventory.tsx` | Item price using `toFixed(2)` (already says OMR but wrong decimals) |

### Changes

**NewOrder.tsx** -- 5 fixes:
- Line 214: `${total.toFixed(2)} OMR` -> `${total.toFixed(3)} OMR`
- Line 312: `$\{item.price.toFixed(2)}` -> `{item.price.toFixed(3)} OMR`
- Line 335: `$\{...toFixed(2)}` -> `{...toFixed(3)} OMR`
- Line 382: `$\{...toFixed(2)}` -> `{...toFixed(3)} OMR`
- Line 428: `$\{total.toFixed(2)}` -> `{total.toFixed(3)} OMR`

**Dashboard.tsx** -- 1 fix:
- Line 173: `$\{todayRevenue.toFixed(2)}` -> `{todayRevenue.toFixed(3)} OMR`

**MenuManagement.tsx** -- 1 fix:
- Line 600: `$\{item.price.toFixed(2)}` -> `{item.price.toFixed(3)} OMR`

**Inventory.tsx** -- 1 fix:
- Line 349: `toFixed(2)` -> `toFixed(3)`

All changes use the same `X.XXX OMR` format already established throughout the rest of the app (POS, Receipts, Reports, Orders pages).

