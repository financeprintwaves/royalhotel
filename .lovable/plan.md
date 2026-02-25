

## QZ Tray Silent Printing Integration

Add direct silent printing to a single thermal printer ("POS_PRINTER") for both Kitchen Order Tickets (KOT) and Customer Invoices, without any browser print dialog.

---

### What Changes

**1. Install dependency**
- Add `qz-tray` package

**2. New file: `src/services/printerService.ts`**
- `connectPrinter()` -- connects to QZ Tray websocket, caches connection
- `printKOT(order, cart, tableName)` -- generates 80mm KOT HTML and sends to "POS_PRINTER"
- `printInvoice(order, cart, payments, branchInfo, waiterName)` -- generates 80mm invoice HTML and sends to "POS_PRINTER"
- Both use `qz.print()` with raw HTML content type
- Fallback: if QZ Tray is not running, shows a toast warning but does NOT block POS workflow

**3. KOT HTML template**
- 280px width, monospace font
- Header: "--- KITCHEN COPY ---"
- Table number or "TAKEAWAY"
- Timestamp
- Items with qty, notes, portion name
- No prices (kitchen doesn't need them)

**4. Invoice HTML template**
- 280px width, monospace font
- Header: "--- CUSTOMER BILL ---"
- Restaurant name, address, phone
- Order number, table, date/time, waiter
- Items with qty, price
- Subtotal, discount, total
- Payment method
- "Thank you" footer

**5. Hook into POS.tsx**
- **`handleSendToKitchen()`** (line ~364): After order is saved and sent to kitchen, call `printKOT()` silently
- **`handleProcessPayment()`** (line ~525): After `quickPayOrder()` succeeds and receipt is built, call `printInvoice()` silently
- Both calls are fire-and-forget with try/catch -- failures show a toast but don't break the flow

**6. Replace existing printService.ts**
- The current `printToLocalPrinter` (localhost:3001 daemon) is replaced by QZ Tray
- `ReceiptDialog` manual "Print" button stays unchanged (uses react-to-print for browser dialog as fallback)

---

### Technical Details

```text
File changes:
  NEW   src/services/printerService.ts   (QZ Tray connect + KOT/Invoice generators + print functions)
  EDIT  src/pages/POS.tsx                (import printerService, add print calls in 2 handlers)
  ADD   qz-tray dependency              (npm install)
```

**No database changes. No UI rebuild. Minimal code additions.**

