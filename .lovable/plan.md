

## Improve Silent Printing -- Unified Print Pipeline

### Problem
The app has two separate print systems that don't talk to each other:
1. **QZ Tray** (`printerService.ts`) -- used by POS and Kitchen for KOT/invoices
2. **Local HTTP daemon** (`printService.ts`) -- used by ReceiptDialog for auto-print
3. **Browser print dialog** (`react-to-print`) -- used as manual fallback in ReceiptDialog

This means if QZ Tray is running but the HTTP daemon isn't (or vice versa), printing silently fails. The manual "Print" button always opens the browser dialog.

### Solution: Unified Print Pipeline with Cascading Fallback

Create a single `silentPrintHTML` function that tries multiple methods in order, only falling back to the browser dialog when the user explicitly clicks "Print".

### Changes

#### 1. Unify print service (`src/services/printService.ts`)

Rewrite to export a single `silentPrintHTML(html)` function with cascading fallback:

1. **Try QZ Tray first** -- calls `connectPrinter()` + `qz.print()` from printerService
2. **Try local HTTP daemon** -- POST to `localhost:3001/print`
3. **Return false** if both fail (no browser dialog triggered automatically)

Also export a `getPrintStatus()` function that returns which method is available (for UI indicators).

#### 2. Update `ReceiptDialog.tsx`

- **Auto-print**: Use the new unified `silentPrintHTML()` instead of only trying the HTTP daemon
- **Manual "Print" button**: Try `silentPrintHTML()` first; only fall back to `react-to-print` (browser dialog) if silent print fails
- Add a small status indicator showing printer connection state (green dot = QZ connected, yellow = HTTP daemon only, grey = no silent print available)

#### 3. Update `printerService.ts`

- Export the `silentPrint` function (currently private) so the unified service can use it
- No other changes needed -- KOT and Invoice printing continue working as before

#### 4. No changes to POS.tsx or KitchenDisplay.tsx

These already use `printKOT`/`printInvoice` from `printerService.ts` which will continue working identically.

### Files Modified

| File | Change |
|------|--------|
| `src/services/printService.ts` | Rewrite: unified `silentPrintHTML()` with QZ Tray -> HTTP daemon fallback cascade |
| `src/services/printerService.ts` | Export `silentPrint` function (was private) |
| `src/components/ReceiptDialog.tsx` | Use unified `silentPrintHTML()` for both auto-print and manual button; add printer status indicator |

### Result
- One-click silent printing that works whether QZ Tray OR local daemon is running
- Manual "Print" button tries silent first, only shows browser dialog as absolute last resort
- Visual feedback showing printer connection status
- No breaking changes to existing KOT/Invoice printing

