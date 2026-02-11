

## Three Features: Portions on Receipt, Order Ringtone, Logo on Print

---

### 1. Show Portion Names on Receipt/Invoice

**Problem**: When a portion (e.g., "Regular", "Large") is selected in POS, the portion name is never saved to the database. The `order_items` table has no column for it. So the receipt only shows "1x Chicken Biryani" instead of "1x Chicken Biryani (Regular)".

**Fix**:

- **Add `portion_name` column** to `order_items` table via migration:
  ```sql
  ALTER TABLE order_items ADD COLUMN portion_name TEXT DEFAULT NULL;
  ```

- **Save portion name when creating order items** in `src/services/orderService.ts` (`addOrderItemsBatch`):
  - Accept `portionName` in the batch item data
  - Include `portion_name` in the insert

- **Pass portion name from POS cart** in `src/pages/POS.tsx`:
  - In `handleSendToKitchen` and `handleFOCConfirm`, map `selectedPortion?.name` into the batch items

- **Display portion name on Receipt** in `src/components/Receipt.tsx`:
  - Change item display from `{item.menu_item?.name}` to `{item.menu_item?.name}{item.portion_name ? ` (${item.portion_name})` : ''}`

| File | Change |
|------|--------|
| Migration SQL | Add `portion_name` column to `order_items` |
| `src/services/orderService.ts` | Accept and save `portion_name` in `addOrderItemsBatch` |
| `src/pages/POS.tsx` | Pass `selectedPortion?.name` as `portionName` in batch items |
| `src/components/Receipt.tsx` | Display portion name next to item name |

---

### 2. Ringtone When New Order Arrives (Orders Page)

**Problem**: When a new order is received on the Orders page, there's no audible notification.

**Fix**:

- **Create a notification sound utility** `src/lib/notificationSound.ts` using the Web Audio API to generate a pleasant ringtone (no external audio file needed).

- **Play sound on new order** in `src/pages/Orders.tsx`:
  - In the `useOrdersRealtime` `onInsert` callback, play the notification sound
  - Also show a toast (already exists)

- **Same for Kitchen Display** in `src/pages/KitchenDisplay.tsx`:
  - Play sound when new kitchen order arrives

| File | Change |
|------|--------|
| `src/lib/notificationSound.ts` | New file: Web Audio API ringtone generator |
| `src/pages/Orders.tsx` | Play ringtone on new order insert |
| `src/pages/KitchenDisplay.tsx` | Play ringtone on new order insert |

---

### 3. Logo on Printed Receipt

**Problem**: No logo appears on receipts/printouts.

**Fix**:

- **Add `logo_url` column** to `branches` table via migration:
  ```sql
  ALTER TABLE branches ADD COLUMN logo_url TEXT DEFAULT NULL;
  ```

- **Create a storage bucket** for branch logos:
  ```sql
  INSERT INTO storage.buckets (id, name, public) VALUES ('branch-logos', 'branch-logos', true);
  ```

- **Fetch and pass logo URL** in `src/components/ReceiptDialog.tsx`:
  - Include `logo_url` in the branch info query
  - Pass it to the Receipt component

- **Display logo on Receipt** in `src/components/Receipt.tsx`:
  - Add `branchLogo` prop
  - Render an `<img>` tag at the top of the receipt header (centered, ~40mm wide for 80mm thermal printer)

- **Upload logo UI** in Branch Management (`src/pages/BranchManagement.tsx`):
  - Add a logo upload field so admins can set the logo per branch

| File | Change |
|------|--------|
| Migration SQL | Add `logo_url` to `branches`, create `branch-logos` storage bucket |
| `src/components/Receipt.tsx` | Add `branchLogo` prop, render logo image in header |
| `src/components/ReceiptDialog.tsx` | Fetch and pass `logo_url` from branch data |
| `src/pages/BranchManagement.tsx` | Add logo upload UI for branches |

---

### Summary of All Changes

| Area | Files Modified | New Files |
|------|---------------|-----------|
| Portions on receipt | Migration, `orderService.ts`, `POS.tsx`, `Receipt.tsx` | None |
| Order ringtone | `Orders.tsx`, `KitchenDisplay.tsx` | `src/lib/notificationSound.ts` |
| Logo on print | Migration, `Receipt.tsx`, `ReceiptDialog.tsx`, `BranchManagement.tsx` | None |

