

## Printer Settings Page + Kitchen Reprint KOT Button

### Overview
1. Create a `printer_settings` database table to store configurable printer name per branch
2. Build a Printer Settings admin page at `/settings/printer`
3. Update `printerService.ts` to read the configured printer name from the database instead of hardcoding `POS_PRINTER`
4. Add a "Print KOT" button to each order card on the Kitchen Display
5. Add route and Dashboard link for the new settings page

---

### 1. Database Migration: `printer_settings` Table

Create a new table to store printer configuration per branch:

```sql
CREATE TABLE public.printer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL UNIQUE,
  printer_name TEXT NOT NULL DEFAULT 'POS_PRINTER',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

-- Admins and managers can manage printer settings
CREATE POLICY "Admins and managers can manage printer settings"
  ON public.printer_settings FOR ALL
  TO authenticated
  USING (is_manager_or_admin(auth.uid()) AND (branch_id = get_user_branch_id(auth.uid()) OR is_admin(auth.uid())))
  WITH CHECK (is_manager_or_admin(auth.uid()) AND (branch_id = get_user_branch_id(auth.uid()) OR is_admin(auth.uid())));

-- All authenticated staff can read printer settings for their branch
CREATE POLICY "Staff can view printer settings"
  ON public.printer_settings FOR SELECT
  TO authenticated
  USING (branch_id = get_user_branch_id(auth.uid()) OR is_admin(auth.uid()));
```

No edge functions needed -- this is a simple CRUD table accessed via the client SDK.

---

### 2. New File: `src/pages/PrinterSettings.tsx`

Admin-only settings page with:
- Input field for printer name (default: "POS_PRINTER")
- Toggle for enabling/disabling auto-print
- Save button that upserts into `printer_settings`
- Test Print button that sends a test page to the configured printer
- Accessible only to admin and manager roles

---

### 3. Update `src/services/printerService.ts`

- Remove hardcoded `const PRINTER_NAME = 'POS_PRINTER'`
- Add `getPrinterName(branchId)` function that queries `printer_settings` table, caches result in memory
- `silentPrint()` accepts an optional printer name override, defaults to the cached setting
- Export `printKOT` for reuse from Kitchen Display

---

### 4. Update `src/pages/KitchenDisplay.tsx`

- Add `Printer` icon import from lucide-react
- Add a "Print KOT" button to each `OrderCard` (next to the Complete button area)
- The button calls `printKOT()` with the order's items, table name, and order number
- Update the `OrderCard` props to include `onPrintKOT` callback
- The button is always visible (not just when all items are ready), so staff can reprint anytime

---

### 5. Update `src/App.tsx`

- Import `PrinterSettings` page
- Add route: `/settings/printer`

---

### 6. Update `src/pages/Dashboard.tsx`

- Add a "Printer Settings" link card for admin/manager roles (with Printer icon)

---

### Files Summary

| Action | File |
|--------|------|
| NEW | `src/pages/PrinterSettings.tsx` |
| EDIT | `src/services/printerService.ts` -- dynamic printer name from DB |
| EDIT | `src/pages/KitchenDisplay.tsx` -- add Print KOT button per order |
| EDIT | `src/App.tsx` -- add printer settings route |
| EDIT | `src/pages/Dashboard.tsx` -- add settings link |
| MIGRATION | New `printer_settings` table with RLS |

